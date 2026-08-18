import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { transcribeAudio } from "../_core/voiceTranscription";
import * as campaignDb from "../campaignDb";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

let geminiModel: string | undefined;

async function selectGeminiModel() {
  if (geminiModel) return geminiModel;
  const catalog = await listLLMModels();
  geminiModel = catalog.data.find(model => model.id === "gemini-3-flash-preview")?.id ?? catalog.data.find(model => model.id.startsWith("gemini-"))?.id;
  if (!geminiModel) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Nenhum modelo Gemini está disponível no momento." });
  return geminiModel;
}

async function ensureAiAccess(userId: number, campaignId: number) {
  const access = await campaignDb.getCampaignAccess(campaignId, userId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso a esta campanha." });
  return access;
}

const AI_GUARDRAILS = `Você é o assistente operacional W9 para gestão de campanhas eleitorais. Apoie planejamento, organização da equipe, agenda, acompanhamento de atividades, indicadores e comunicação institucional. Não use dados pessoais para inferir atributos sensíveis, fazer segmentação persuasiva individualizada ou direcionar mensagens a indivíduos. Não invente dados da campanha. Não produza instruções para violar normas eleitorais ou contornar fiscalização. Quando houver risco jurídico, destaque a necessidade de revisão pela equipe jurídica. Responda em português do Brasil, com objetividade e organização.`;

function contentToText(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === "string" ? content : content.filter(item => item.type === "text").map(item => item.text ?? "").join("\n");
}

export const aiRouter = router({
  history: protectedProcedure.input(z.object({ campaignId: z.number().int().positive() })).query(async ({ ctx, input }) => { await ensureAiAccess(ctx.user.id, input.campaignId); return campaignDb.listAiMessages(input.campaignId, ctx.user.id, "chat"); }),
  chat: protectedProcedure.input(z.object({ campaignId: z.number().int().positive(), message: z.string().min(2).max(4000) })).mutation(async ({ ctx, input }) => {
    const access = await ensureAiAccess(ctx.user.id, input.campaignId);
    const history = await campaignDb.listAiMessages(input.campaignId, ctx.user.id, "chat");
    await campaignDb.saveAiMessage({ campaignId: input.campaignId, userId: ctx.user.id, kind: "chat", role: "user", content: input.message });
    const response = await invokeLLM({
      model: await selectGeminiModel(),
      maxTokens: 1200,
      messages: [
        { role: "system", content: `${AI_GUARDRAILS}\nCampanha: ${access.campaign.name}. Cargo/eleição: ${access.campaign.electionLabel}. Região: ${access.campaign.region}.` },
        ...history.reverse().map(item => ({ role: item.role, content: item.content })),
        { role: "user", content: input.message },
      ],
    });
    const answer = contentToText(response.choices[0]?.message.content ?? "").trim() || "Não consegui produzir uma resposta agora. Tente novamente em instantes.";
    await campaignDb.saveAiMessage({ campaignId: input.campaignId, userId: ctx.user.id, kind: "chat", role: "assistant", content: answer });
    return { answer };
  }),
  generateContent: protectedProcedure.input(z.object({ campaignId: z.number().int().positive(), format: z.enum(["post", "roteiro", "nota", "convite"]), subject: z.string().min(3).max(600), objective: z.string().min(3).max(600), tone: z.enum(["institucional", "próximo", "informativo"]).default("institucional") })).mutation(async ({ ctx, input }) => {
    const access = await ensureAiAccess(ctx.user.id, input.campaignId);
    const prompt = `Crie um ${input.format} de comunicação pública e institucional para a campanha ${access.campaign.name}. Tema: ${input.subject}. Objetivo: ${input.objective}. Tom: ${input.tone}. O texto deve ser geral, não usar dados pessoais, não fazer microsegmentação, evitar alegações não verificáveis e incluir uma nota curta de revisão antes da publicação.`;
    await campaignDb.saveAiMessage({ campaignId: input.campaignId, userId: ctx.user.id, kind: "content", role: "user", content: prompt, metadata: input });
    const response = await invokeLLM({ model: await selectGeminiModel(), maxTokens: 1200, messages: [{ role: "system", content: AI_GUARDRAILS }, { role: "user", content: prompt }] });
    const content = contentToText(response.choices[0]?.message.content ?? "").trim() || "Não foi possível gerar o material agora.";
    await campaignDb.saveAiMessage({ campaignId: input.campaignId, userId: ctx.user.id, kind: "content", role: "assistant", content });
    return { content };
  }),
  processAudioCrm: protectedProcedure.input(z.object({ campaignId: z.number().int().positive(), filename: z.string().min(3).max(180), mimeType: z.enum(["audio/webm", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4"]), dataBase64: z.string().min(20).max(22_000_000), consentConfirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
    const access = await ensureAiAccess(ctx.user.id, input.campaignId);
    const member = access.member;
    if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "O processamento de áudio requer um vínculo ativo à campanha." });
    const rawBase64 = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop()! : input.dataBase64;
    const audioBuffer = Buffer.from(rawBase64, "base64");
    if (!audioBuffer.length || audioBuffer.byteLength > 16 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "O áudio deve ter no máximo 16 MB." });
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const savedFile = await storagePut(`campaigns/${input.campaignId}/audio-crm/${Date.now()}-${safeName}`, audioBuffer, input.mimeType);
    const origin = `${ctx.req.protocol}://${ctx.req.get("host")}`;
    const audioUrl = new URL(savedFile.url, origin).toString();
    const transcription = await transcribeAudio({ audioUrl, language: "pt", prompt: "Transcreva fielmente este relato de campo em português brasileiro." });
    if ("error" in transcription) throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
    const extraction = await invokeLLM({
      model: await selectGeminiModel(),
      maxTokens: 800,
      messages: [
        { role: "system", content: "Extraia somente os dados explicitamente mencionados em um relato de campo. Não deduza informações e retorne JSON conforme o esquema." },
        { role: "user", content: transcription.text },
      ],
      response_format: { type: "json_schema", json_schema: { name: "audio_crm_contact", strict: true, schema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, neighborhood: { type: "string" }, region: { type: "string" }, address: { type: "string" }, primaryDemand: { type: "string" }, engagementLevel: { type: "string", enum: ["low", "medium", "high"] } }, required: ["name", "phone", "neighborhood", "region", "address", "primaryDemand", "engagementLevel"], additionalProperties: false } } },
    });
    const extractedText = contentToText(extraction.choices[0]?.message.content ?? "");
    let extracted: { name: string; phone: string; neighborhood: string; region: string; address: string; primaryDemand: string; engagementLevel: "low" | "medium" | "high" };
    try { extracted = JSON.parse(extractedText); } catch { throw new TRPCError({ code: "BAD_GATEWAY", message: "A extração de dados não retornou uma estrutura válida." }); }
    let voterId: number | null = null;
    if (extracted.name.trim().length >= 2) {
      voterId = await campaignDb.createVoter({ campaignId: input.campaignId, ownerMemberId: member.id, name: extracted.name.trim(), phone: extracted.phone || null, neighborhood: extracted.neighborhood || null, region: extracted.region || null, address: extracted.address || null, primaryDemand: extracted.primaryDemand || null, engagementLevel: extracted.engagementLevel, contactConsent: true });
    }
    const logId = await campaignDb.saveAudioCrmLog({ campaignId: input.campaignId, memberId: member.id, audioUrl: savedFile.url, transcription: transcription.text, extractedData: extracted, voterId, processed: true });
    return { logId, voterId, transcription: transcription.text, extracted };
  }),
});
