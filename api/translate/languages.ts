import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAuth } from "../../lib/auth";
import { SUPPORTED_LANGUAGES } from "../../lib/translate";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  res.json({ ok: true, data: { languages: SUPPORTED_LANGUAGES } });
}
