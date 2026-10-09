import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { sdk } from "./sdk";

export const GLOBAL_BODY_LIMIT = "2mb";
export const AUDIO_CRM_BODY_LIMIT = "24mb";
export const AUDIO_CRM_TRPC_PATH = "/api/trpc/ai.processAudioCrm";

const commonJsonParser = express.json({ limit: GLOBAL_BODY_LIMIT });
const commonUrlencodedParser = express.urlencoded({ limit: GLOBAL_BODY_LIMIT, extended: true });
const audioCrmJsonParser = express.json({ limit: AUDIO_CRM_BODY_LIMIT });

type BodyParserError = Error & { type?: string; status?: number; statusCode?: number };

export function isAudioCrmUploadRequest(req: Pick<Request, "path" | "method">) {
  return req.method.toUpperCase() === "POST" && req.path === AUDIO_CRM_TRPC_PATH;
}

function sanitizedParserFailure(error: unknown, res: Response, next: NextFunction) {
  const parserError = error as BodyParserError | undefined;
  if (parserError?.type === "entity.too.large" || parserError?.status === 413 || parserError?.statusCode === 413) {
    res.status(413).json({ error: "Payload muito grande." });
    return;
  }
  if (parserError?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON inválido." });
    return;
  }
  next(error);
}

function runCommonParsers(req: Request, res: Response, next: NextFunction) {
  commonJsonParser(req, res, error => {
    if (error) return sanitizedParserFailure(error, res, next);
    commonUrlencodedParser(req, res, urlencodedError => {
      if (urlencodedError) return sanitizedParserFailure(urlencodedError, res, next);
      next();
    });
  });
}

async function runAudioParser(req: Request, res: Response, next: NextFunction) {
  try {
    await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }

  audioCrmJsonParser(req, res, error => {
    if (error) return sanitizedParserFailure(error, res, next);
    next();
  });
}

export function registerBodyParsers(app: Express) {
  app.use((req, res, next) => {
    if (isAudioCrmUploadRequest(req)) {
      void runAudioParser(req, res, next);
      return;
    }
    runCommonParsers(req, res, next);
  });
}
