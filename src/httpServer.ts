import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { bambooConfig } from './config.js';
import { createBambooMcpServer } from './server.js';

function getPathname(url: string | undefined): string {
  return new URL(url ?? '/', 'http://localhost').pathname;
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!rawBody.trim()) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

function writeJsonRpcError(res: ServerResponse, statusCode: number, message: string): void {
  writeJson(res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    writeJsonRpcError(res, 405, 'Method not allowed.');
    return;
  }

  const server = createBambooMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: bambooConfig.enableJsonResponse,
    allowedHosts: bambooConfig.allowedHosts,
    allowedOrigins: bambooConfig.allowedOrigins,
    enableDnsRebindingProtection: bambooConfig.enableDnsRebindingProtection,
  });

  let cleanedUp = false;
  const cleanup = async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    await Promise.allSettled([
      transport.close(),
      server.close(),
    ]);
  };

  res.once('close', () => {
    void cleanup();
  });

  try {
    const parsedBody = await readJsonBody(req);
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    await cleanup();

    if (!res.headersSent) {
      if (error instanceof SyntaxError) {
        writeJsonRpcError(res, 400, 'Invalid JSON body.');
        return;
      }

      writeJson(res, 500, {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        id: null,
      });
    }
  }
}

export function createBambooHttpServer(): Server {
  return createServer(async (req, res) => {
    const pathname = getPathname(req.url);

    if (pathname === '/health') {
      writeJson(res, 200, { ok: true });
      return;
    }

    if (pathname !== bambooConfig.httpPath) {
      writeJson(res, 404, { error: 'Not found' });
      return;
    }

    await handleMcpRequest(req, res);
  });
}

export async function startStreamableHttpServer(): Promise<Server> {
  const httpServer = createBambooHttpServer();

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(bambooConfig.httpPort, bambooConfig.httpHost, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  console.error(
    `BambooHR MCP Server is running on streamable HTTP at http://${bambooConfig.httpHost}:${bambooConfig.httpPort}${bambooConfig.httpPath}`,
  );

  return httpServer;
}
