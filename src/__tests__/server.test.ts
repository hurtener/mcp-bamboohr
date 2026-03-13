import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const mockGetBambooClientForRequest = jest.fn(() => ({}));
const mockListDatasetsData = jest.fn();
const mockGetDatasetFieldsData = jest.fn();
const mockGetTabularFieldsData = jest.fn();

jest.mock('../config', () => ({
  bambooConfig: {
    transport: 'streamable-http',
    debug: false,
    enableMutations: false,
    httpHost: '127.0.0.1',
    httpPort: 3000,
    httpPath: '/mcp',
    enableJsonResponse: true,
    enableDnsRebindingProtection: false,
    apiToken: 'test-token',
    companyDomain: 'test-company',
    baseUrl: 'https://test-company.bamboohr.com/api/v1',
  },
}));

jest.mock('../requestContext', () => ({
  getBambooClientForRequest: mockGetBambooClientForRequest,
}));

jest.mock('../bambooData', () => {
  const actual = jest.requireActual('../bambooData');

  return {
    ...actual,
    listDatasetsData: mockListDatasetsData,
    getDatasetFieldsData: mockGetDatasetFieldsData,
    getTabularFieldsData: mockGetTabularFieldsData,
  };
});

import { createBambooMcpServer } from '../server';

describe('MCP server surface', () => {
  let client: Client;
  let server: ReturnType<typeof createBambooMcpServer>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'employees' }] });
    mockGetDatasetFieldsData.mockResolvedValue({ fields: [{ name: 'department' }] });
    mockGetTabularFieldsData.mockResolvedValue({ fields: [{ name: 'jobTitle' }] });

    server = createBambooMcpServer();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterEach(async () => {
    await Promise.allSettled([client.close(), server.close()]);
  });

  it('should expose tools, prompts, resources, and resource templates', async () => {
    const tools = await client.listTools();
    const prompts = await client.listPrompts();
    const resources = await client.listResources();
    const resourceTemplates = await client.listResourceTemplates();

    expect(tools.tools.some((tool) => tool.name === 'list-datasets')).toBe(true);
    expect(tools.tools.some((tool) => tool.name === 'create-time-off-request')).toBe(true);
    expect(prompts.prompts.some((prompt) => prompt.name === 'bamboohr-surface-orientation')).toBe(true);
    expect(resources.resources.some((resource) => resource.uri === 'bamboohr://surface/catalog')).toBe(true);
    expect(resourceTemplates.resourceTemplates.some((resource) => resource.uriTemplate === 'bamboohr://surface/datasets/{dataset}/fields')).toBe(true);
  });

  it('should render prompts and resources', async () => {
    const prompt = await client.getPrompt({ name: 'bamboohr-people-analysis', arguments: { question: 'Who leads engineering?' } });
    const catalog = await client.readResource({ uri: 'bamboohr://surface/catalog' });
    const datasets = await client.readResource({ uri: 'bamboohr://surface/datasets' });
    const datasetFields = await client.readResource({ uri: 'bamboohr://surface/datasets/employees/fields' });

    expect(prompt.messages[0].content.type).toBe('text');
    expect((prompt.messages[0].content as any).text).toContain('Who leads engineering?');
    expect((catalog.contents[0] as any).text).toContain('BambooHR MCP Surface');
    expect(JSON.parse((datasets.contents[0] as any).text)).toEqual({ datasets: [{ name: 'employees' }] });
    expect(JSON.parse((datasetFields.contents[0] as any).text)).toEqual({ fields: [{ name: 'department' }] });
  });
});
