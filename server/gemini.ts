type GeminiMessage = { role: "user" | "assistant"; content: string };

type GeminiRequest = {
  systemInstruction: string;
  messages: GeminiMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GeminiApiError";
  }
}

export async function generateWithGemini(request: GeminiRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiApiError("A chave da API Gemini não está configurada.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.systemInstruction }] },
      contents: request.messages.map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens ?? 1200,
        temperature: request.temperature ?? 0.35,
        ...(request.responseMimeType ? { responseMimeType: request.responseMimeType } : {}),
      },
    }),
  });

  const payload = await response.json() as GeminiResponse;
  if (!response.ok) throw new GeminiApiError(payload.error?.message ?? "Não foi possível consultar o Gemini agora.", response.status);

  const content = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim();
  if (!content) {
    const reason = payload.promptFeedback?.blockReason ? ` (${payload.promptFeedback.blockReason})` : "";
    throw new GeminiApiError(`O Gemini não retornou uma resposta utilizável${reason}.`);
  }
  return content;
}
