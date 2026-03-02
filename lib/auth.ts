import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_TOKEN = process.env.API_TOKEN || "";

export function checkAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!API_TOKEN) return true; // No token configured = open access

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Missing authorization" });
    return false;
  }
  if (authHeader.slice(7) !== API_TOKEN) {
    res.status(403).json({ ok: false, error: "Invalid token" });
    return false;
  }
  return true;
}
