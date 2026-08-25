import type { NextFunction, Request, Response } from "express";

export const CANONICAL_W9_HOST = "www.w9campanhaseleitorais.com.br";
const ROOT_W9_HOST = "w9campanhaseleitorais.com.br";

function normalizedHost(req: Request) {
  return (req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "");
}

export function canonicalW9HostRedirect(req: Request, res: Response, next: NextFunction) {
  if (normalizedHost(req) !== ROOT_W9_HOST) return next();
  return res.redirect(308, `https://${CANONICAL_W9_HOST}${req.originalUrl || req.url}`);
}
