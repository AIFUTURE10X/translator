import type { IncomingMessage, ServerResponse } from "http";

export interface VercelRequest extends IncomingMessage {
  body?: any;
  query: Record<string, string | string[] | undefined>;
}

export interface VercelResponse extends ServerResponse {
  status(statusCode: number): this;
  json(body: unknown): void;
}
