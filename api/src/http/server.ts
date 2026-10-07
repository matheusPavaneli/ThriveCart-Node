import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type ApiRequest, type ApiResponse, errorResponse } from './http-api.ts';

export const MAX_BODY_BYTES = 8192;

export interface RequestHandler {
  handle(request: ApiRequest): ApiResponse;
}

/** The slice of a pino logger the server needs. */
export interface ErrorLogger {
  error(details: { err: unknown }, message: string): void;
}

/** Adapts an HttpApi to node:http: reads a bounded body, writes JSON, turns a failure into a logged 500. */
export function createApiServer(api: RequestHandler, log: ErrorLogger): Server {
  const server = createServer((req, res) => {
    respond(api, req, res).catch((err: unknown) => {
      log.error({ err }, 'request failed');
      if (res.headersSent) {
        res.destroy();
        return;
      }
      send(res, errorResponse(500, 'internal_error', 'The basket service failed. Please try again.'));
    });
  });
  server.headersTimeout = 5_000;
  server.requestTimeout = 10_000;
  return server;
}

async function respond(api: RequestHandler, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req, MAX_BODY_BYTES);
  if (body === null) {
    send(res, errorResponse(413, 'payload_too_large', `The request body is over ${MAX_BODY_BYTES} bytes.`, { Connection: 'close' }));
    return;
  }
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  send(res, api.handle({ method: req.method ?? 'GET', path, body }));
}

/** Resolves null as soon as the body passes `limit`, without buffering the rest. */
function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.removeAllListeners('data');
        req.resume();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, { status, body, headers }: ApiResponse): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}
