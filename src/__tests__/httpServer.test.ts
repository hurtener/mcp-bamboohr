jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('httpServer smoke', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock('../config');
    process.env = {
      ...originalEnv,
      MCP_TRANSPORT: 'streamable-http',
      MCP_HTTP_HOST: '127.0.0.1',
      MCP_HTTP_PORT: '3100',
      MCP_HTTP_PATH: '/mcp',
      MCP_HTTP_ENABLE_JSON_RESPONSE: 'true',
      BAMBOO_ENABLE_MUTATIONS: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should serve MCP listings and reject mutations when disabled', async () => {
    const { createBambooHttpServer } = require('../httpServer');
    const server = createBambooHttpServer();

    try {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind test HTTP server');
      }

      const baseUrl = `http://127.0.0.1:${address.port}/mcp`;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };

      const initialize = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'smoke', version: '1.0.0' },
          },
        }),
      });

      const tools = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
      });

      const resources = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'resources/list', params: {} }),
      });

      const prompts = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'prompts/list', params: {} }),
      });

      const mutation = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'create-time-off-request',
            arguments: {
              employeeId: '123',
              payload: { start: '2025-05-01' },
              confirm: true,
            },
          },
        }),
      });

      const initializeJson = await initialize.json();
      const toolsJson = await tools.json();
      const resourcesJson = await resources.json();
      const promptsJson = await prompts.json();
      const mutationJson = await mutation.json();

      expect(initialize.status).toBe(200);
      expect(initializeJson.jsonrpc).toBe('2.0');
      expect(toolsJson.result.tools.some((tool: any) => tool.name === 'list-datasets')).toBe(true);
      expect(resourcesJson.result.resources.some((resource: any) => resource.uri === 'bamboohr://surface/catalog')).toBe(true);
      expect(promptsJson.result.prompts.some((prompt: any) => prompt.name === 'bamboohr-time-off-workflow')).toBe(true);
      expect(mutationJson.result.isError).toBe(true);
      expect(mutationJson.result.content[0].text).toContain('BambooHR mutations are disabled');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
    }
  });
});
