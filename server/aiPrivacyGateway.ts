import { createOrganizationAuditLog } from "./campaignDb";
import { generateWithOpenRouterDetailed, OpenRouterApiError, OPENROUTER_MODEL_CHAIN, type OpenRouterMessage } from "./openrouter";

export type AiPurpose = "operational_chat" | "public_content" | "audio_extraction";

const PERSONAL_MINIMIZED_MODELS = [OPENROUTER_MODEL_CHAIN[0], OPENROUTER_MODEL_CHAIN[1]] as const;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const PHONE_RE = /(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?(?:9\s*)?\d{4}[\s.-]*\d{4}(?!\d)/g;
const SENSITIVE_INFERENCE_RE = /\b(?:inferir|deduzir|classificar|segmentar|microsegmentar|prever)\b.{0,80}\b(?:opini[aã]o pol[ií]tica|ideologia|inten[cç][aã]o de voto|voto|religi[aã]o|ra[cç]a|etnia|sa[uú]de|orienta[cç][aã]o sexual|vida sexual)\b/i;

export type AiGatewayContext = {
  organizationId: number;
  campaignId: number;
  userId: number;
  purpose: AiPurpose;
  consentConfirmed?: boolean;
};

type GatewayRequest = AiGatewayContext & {
  systemInstruction: string;
  messages: OpenRouterMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
};

export function redactDirectIdentifiers(text: string) {
  let redactionCount = 0;
  const replace = (pattern: RegExp, label: string, value: string) => value.replace(pattern, () => { redactionCount += 1; return label; });
  let sanitized = replace(EMAIL_RE, "[EMAIL_REMOVIDO]", text);
  sanitized = replace(CPF_RE, "[CPF_REMOVIDO]", sanitized);
  sanitized = replace(PHONE_RE, "[TELEFONE_REMOVIDO]", sanitized);
  return { text: sanitized, redactionCount };
}

export function extractDirectIdentifiers(text: string) {
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\D/g, "") ?? null;
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const cpf = text.match(CPF_RE)?.[0]?.replace(/\D/g, "") ?? null;
  return { phone, email, cpf };
}

function sanitizeMessages(purpose: AiPurpose, messages: OpenRouterMessage[]) {
  let redactionCount = 0;
  const sanitized = messages.map(message => {
    const result = redactDirectIdentifiers(message.content);
    redactionCount += result.redactionCount;
    return { ...message, content: result.text };
  });
  const joined = sanitized.map(message => message.content).join("\n");
  if (SENSITIVE_INFERENCE_RE.test(joined)) throw new Error("AI_PRIVACY_SENSITIVE_INFERENCE_BLOCKED");
  return { messages: sanitized, redactionCount, purpose };
}

function allowedModelsForPurpose(purpose: AiPurpose) {
  return purpose === "audio_extraction" ? [...PERSONAL_MINIMIZED_MODELS] : [...OPENROUTER_MODEL_CHAIN];
}

async function audit(context: AiGatewayContext, input: { status: "success" | "blocked" | "error"; model?: string | null; latencyMs: number; inputChars: number; outputChars?: number; redactionCount: number; reason?: string }) {
  await createOrganizationAuditLog({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "ai.external_call",
    entityType: "campaign",
    entityId: context.campaignId,
    metadata: {
      purpose: context.purpose,
      provider: "openrouter",
      model: input.model ?? null,
      status: input.status,
      latencyMs: input.latencyMs,
      inputChars: input.inputChars,
      outputChars: input.outputChars ?? 0,
      redactionCount: input.redactionCount,
      reason: input.reason ?? null,
    },
  });
}

export async function generateThroughAiPrivacyGateway(request: GatewayRequest) {
  const started = Date.now();
  if (request.purpose === "audio_extraction" && request.consentConfirmed !== true) {
    await audit(request, { status: "blocked", latencyMs: 0, inputChars: 0, redactionCount: 0, reason: "consent_required" });
    throw new Error("AI_PRIVACY_CONSENT_REQUIRED");
  }

  let sanitized: ReturnType<typeof sanitizeMessages>;
  try {
    sanitized = sanitizeMessages(request.purpose, request.messages);
  } catch (error) {
    await audit(request, { status: "blocked", latencyMs: Date.now() - started, inputChars: request.messages.reduce((sum, message) => sum + message.content.length, 0), redactionCount: 0, reason: error instanceof Error ? error.message : "policy_block" });
    throw error;
  }

  const sanitizedSystem = redactDirectIdentifiers(request.systemInstruction);
  const redactionCount = sanitized.redactionCount + sanitizedSystem.redactionCount;
  const inputChars = sanitizedSystem.text.length + sanitized.messages.reduce((sum, message) => sum + message.content.length, 0);
  try {
    const result = await generateWithOpenRouterDetailed({
      systemInstruction: sanitizedSystem.text,
      messages: sanitized.messages,
      maxOutputTokens: request.maxOutputTokens,
      temperature: request.temperature,
      responseMimeType: request.responseMimeType,
      allowedModels: allowedModelsForPurpose(request.purpose),
    });
    await audit(request, { status: "success", model: result.model, latencyMs: Date.now() - started, inputChars, outputChars: result.content.length, redactionCount });
    return result.content;
  } catch (error) {
    const model = error instanceof OpenRouterApiError ? error.attemptedModels.at(-1) ?? null : null;
    await audit(request, { status: "error", model, latencyMs: Date.now() - started, inputChars, redactionCount, reason: error instanceof Error ? error.name : "provider_error" });
    throw error;
  }
}
