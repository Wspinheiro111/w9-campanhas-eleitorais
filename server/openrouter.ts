type OpenRouterMessage = { role: "user" | "assistant"; content: string };

type OpenRouterRequest = {
  systemInstruction: string;
  messages: OpenRouterMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  error?: { message?: string; code?: number | string };
};

export const OPENROUTER_MODEL_CHAIN = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "z-ai/glm-5.2:free",
  "minimax/minimax-m3:free",
  "poolside/laguna-s-2.1:free",
  "thinkingmachines/inkling-small:free",
  "cohere/north-mini-code:free",
  "google/gemma-4-31b-it:free",
] as const;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_COOLDOWN_MS = 60_000;
const MODEL_TIMEOUT_MS = 25_000;
const cooldownUntil = new Map<string, number>();

export class OpenRouterApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly attemptedModels: string[] = []) {
    super(message);
    this.name = "OpenRouterApiError";
  }
}

function responseText(content: string | Array<{ type?: string; text?: string }> | undefined) {
  if (typeof content === "string") return content.trim();
  return content?.map(part => part.text ?? "").join("").trim() ?? "";
}

function retryAfterMs(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10 * 60_000) : MODEL_COOLDOWN_MS;
}

function shouldTryNextModel(status: number) {
  return status !== 401 && status !== 403;
}

function markUnavailable(model: string, response: Response) {
  cooldownUntil.set(model, Date.now() + retryAfterMs(response));
}

function availableModels() {
  const now = Date.now();
  return OPENROUTER_MODEL_CHAIN.filter(model => (cooldownUntil.get(model) ?? 0) <= now);
}

export async function generateWithOpenRouter(request: OpenRouterRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new OpenRouterApiError("A chave da API OpenRouter não está configurada.");

  const models = availableModels();
  const attemptedModels: string[] = [];
  if (!models.length) throw new OpenRouterApiError("Todos os modelos OpenRouter estão temporariamente em cooldown.", 429, attemptedModels);

  const messages = [
    { role: "system" as const, content: request.systemInstruction },
    ...request.messages,
  ];

  for (const model of models) {
    attemptedModels.push(model);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://w9campanhaseleitorais.com.br",
          "X-Title": "W9 Campanhas Eleitorais",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.35,
          max_tokens: request.maxOutputTokens ?? 1200,
          ...(request.responseMimeType === "application/json" ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      clearTimeout(timeout);
      const payload = await response.json() as OpenRouterResponse;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new OpenRouterApiError(payload.error?.message ?? "A chave do OpenRouter não foi autorizada.", response.status, attemptedModels);
        }
        if (shouldTryNextModel(response.status)) markUnavailable(model, response);
        continue;
      }

      const content = responseText(payload.choices?.[0]?.message?.content);
      if (content) return content;
      markUnavailable(model, response);
    } catch (error) {
      if (error instanceof OpenRouterApiError) throw error;
      cooldownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
    }
  }

  throw new OpenRouterApiError("Nenhum modelo OpenRouter disponível para concluir a solicitação.", 503, attemptedModels);
}

export function resetOpenRouterCooldowns() {
  cooldownUntil.clear();
}
