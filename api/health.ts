import type { VercelRequest, VercelResponse } from "../lib/vercel";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, time: new Date().toISOString() });
}
