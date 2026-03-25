import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SUPPORTED_LANGUAGES } from "../../lib/translate";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, data: { languages: SUPPORTED_LANGUAGES } });
}
