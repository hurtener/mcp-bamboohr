import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMON_HISTORY_TABLES, getDatasetFieldsData, getTabularFieldsData, listDatasetsData } from './bambooData.js';
import { getBambooClientForRequest } from './requestContext.js';

type SurfaceToolEntry = {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  category: string;
};

type SurfacePromptEntry = {
  name: string;
  title: string;
  description: string;
};

type SurfaceResourceEntry = {
  name: string;
  uri: string;
  title: string;
  description: string;
};

export const SURFACE_TOOLS: SurfaceToolEntry[] = [
  { name: 'get-employee', title: 'Get Employee', description: 'Get a single employee record with selected fields.', readOnly: true, category: 'Employees' },
  { name: 'get-employee-photo', title: 'Get Employee Photo', description: 'Fetch an employee photo in a requested size.', readOnly: true, category: 'Employees' },
  { name: 'get-employee-directory', title: 'Get Employee Directory', description: 'Read the employee directory when enabled in BambooHR.', readOnly: true, category: 'Employees' },
  { name: 'get-employee-goals', title: 'Get Employee Goals', description: 'Fetch performance goals for an employee.', readOnly: true, category: 'Employees' },
  { name: 'estimate-time-off-balance', title: 'Estimate Future Time Off Balance', description: 'Estimate a future balance for an employee time-off type.', readOnly: true, category: 'Time Off' },
  { name: 'get-time-off-requests', title: 'Get Time Off Requests', description: 'List or filter BambooHR time-off requests.', readOnly: true, category: 'Time Off' },
  { name: 'get-whos-out', title: "Get Who's Out", description: 'List upcoming time-off and holiday events.', readOnly: true, category: 'Time Off' },
  { name: 'list-time-off-policies', title: 'List Time Off Policies', description: 'List account-level time-off policies.', readOnly: true, category: 'Time Off' },
  { name: 'get-employee-time-off-policies', title: 'Get Employee Time Off Policies', description: 'Fetch policy assignments for a specific employee.', readOnly: true, category: 'Time Off' },
  { name: 'create-time-off-request', title: 'Create Time Off Request', description: 'Create a BambooHR time-off request. Mutating, requires confirm=true.', readOnly: false, category: 'Time Off' },
  { name: 'change-time-off-request-status', title: 'Change Time Off Request Status', description: 'Approve, deny, or cancel a request. Mutating, requires confirm=true.', readOnly: false, category: 'Time Off' },
  { name: 'list-company-files', title: 'List Company Files', description: 'List company file categories and files.', readOnly: true, category: 'Files' },
  { name: 'get-company-file', title: 'Get Company File', description: 'Fetch a company file or its binary content.', readOnly: true, category: 'Files' },
  { name: 'get-meta-fields', title: 'Get Meta Fields', description: 'List BambooHR field definitions.', readOnly: true, category: 'Metadata' },
  { name: 'list-datasets', title: 'List Datasets', description: 'List available BambooHR datasets.', readOnly: true, category: 'Datasets' },
  { name: 'get-dataset-fields', title: 'Get Dataset Fields', description: 'List fields exposed by a BambooHR dataset.', readOnly: true, category: 'Datasets' },
  { name: 'get-dataset-field-options', title: 'Get Dataset Field Options', description: 'Retrieve possible filter values for dataset fields.', readOnly: true, category: 'Datasets' },
  { name: 'query-dataset', title: 'Query Dataset', description: 'Execute a structured query against a BambooHR dataset.', readOnly: true, category: 'Datasets' },
  { name: 'get-tabular-fields', title: 'Get Tabular Fields', description: 'List BambooHR tabular table and field metadata.', readOnly: true, category: 'Datasets' },
  { name: 'get-employee-table', title: 'Get Employee Table', description: 'Fetch rows from a BambooHR employee history table.', readOnly: true, category: 'History' },
  { name: 'get-changed-employee-ids', title: 'Get Changed Employee IDs', description: 'List employees changed since a point in time.', readOnly: true, category: 'History' },
  { name: 'get-changed-table-rows', title: 'Get Changed Table Rows', description: 'List changed table rows since a point in time.', readOnly: true, category: 'History' },
  { name: 'search-people', title: 'Search People', description: 'Curated people search over BambooHR employee data.', readOnly: true, category: 'Workflows' },
  { name: 'get-employee-history', title: 'Get Employee History', description: 'Aggregate common employee history tables.', readOnly: true, category: 'Workflows' },
];

export const SURFACE_PROMPTS: SurfacePromptEntry[] = [
  { name: 'bamboohr-surface-orientation', title: 'BambooHR Surface Orientation', description: 'Explains how to choose among the BambooHR tools, resources, and prompts.' },
  { name: 'bamboohr-people-analysis', title: 'BambooHR People Analysis', description: 'Guides an agent through org and people analysis using the BambooHR surface.' },
  { name: 'bamboohr-time-off-workflow', title: 'BambooHR Time Off Workflow', description: 'Guides safe time-off inspection and mutation workflows.' },
];

export const SURFACE_RESOURCES: SurfaceResourceEntry[] = [
  { name: 'bamboohr-surface-catalog', uri: 'bamboohr://surface/catalog', title: 'BambooHR Surface Catalog', description: 'Catalog of BambooHR tools, prompts, resources, and routing guidance.' },
  { name: 'bamboohr-surface-datasets', uri: 'bamboohr://surface/datasets', title: 'BambooHR Datasets', description: 'Datasets available to the current BambooHR credential.' },
  { name: 'bamboohr-surface-tables', uri: 'bamboohr://surface/tables', title: 'BambooHR Tables', description: 'Common history tables and discovered BambooHR tabular fields.' },
  { name: 'bamboohr-surface-dataset-fields', uri: 'bamboohr://surface/datasets/{dataset}/fields', title: 'BambooHR Dataset Fields', description: 'Template resource returning field metadata for a dataset.' },
];

function renderCatalogMarkdown(): string {
  const toolsByCategory = SURFACE_TOOLS.reduce<Record<string, SurfaceToolEntry[]>>((acc, tool) => {
    acc[tool.category] ??= [];
    acc[tool.category].push(tool);
    return acc;
  }, {});

  const toolSections = Object.entries(toolsByCategory)
    .map(([category, tools]) => {
      const lines = tools
        .map((tool) => `- \`${tool.name}\` (${tool.readOnly ? 'read-only' : 'mutating'}): ${tool.description}`)
        .join('\n');
      return `### ${category}\n${lines}`;
    })
    .join('\n\n');

  const promptLines = SURFACE_PROMPTS
    .map((prompt) => `- \`${prompt.name}\`: ${prompt.description}`)
    .join('\n');

  const resourceLines = SURFACE_RESOURCES
    .map((resource) => `- \`${resource.uri}\`: ${resource.description}`)
    .join('\n');

  return [
    '# BambooHR MCP Surface',
    '',
    '## Auth Model',
    '- In streamable HTTP mode, BambooHR credentials are request-scoped.',
    '- Prefer request headers or MCP `_meta.bamboohr` credentials over process-level environment variables.',
    '- Mutating tools require `confirm=true` and only work when `BAMBOO_ENABLE_MUTATIONS=true`.',
    '',
    '## Routing Guidance',
    '- Use datasets for bulk search, analytics, and custom filtering.',
    '- Use employee tables for historical row data such as job, compensation, and status changes.',
    '- Use curated workflow tools when you want compact, agent-friendly output.',
    '- Inspect with read-only tools before using time-off mutation tools.',
    '',
    '## Tools',
    toolSections,
    '',
    '## Prompts',
    promptLines,
    '',
    '## Resources',
    resourceLines,
  ].join('\n');
}

export function registerSurfaceResources(server: McpServer): void {
  server.registerResource('bamboohr-surface-catalog', 'bamboohr://surface/catalog', {
    title: 'BambooHR Surface Catalog',
    description: 'Catalog of BambooHR tools, prompts, resources, and routing guidance.',
    mimeType: 'text/markdown',
  }, async () => ({
    contents: [{
      uri: 'bamboohr://surface/catalog',
      mimeType: 'text/markdown',
      text: renderCatalogMarkdown(),
    }],
  }));

  server.registerResource('bamboohr-surface-datasets', 'bamboohr://surface/datasets', {
    title: 'BambooHR Datasets',
    description: 'Datasets available to the current BambooHR credential.',
    mimeType: 'application/json',
  }, async (_uri, extra) => {
    const client = getBambooClientForRequest(extra);
    const datasets = await listDatasetsData(client);

    return {
      contents: [{
        uri: 'bamboohr://surface/datasets',
        mimeType: 'application/json',
        text: JSON.stringify(datasets, null, 2),
      }],
    };
  });

  server.registerResource('bamboohr-surface-tables', 'bamboohr://surface/tables', {
    title: 'BambooHR Tables',
    description: 'Common history tables and discovered BambooHR tabular fields.',
    mimeType: 'application/json',
  }, async (_uri, extra) => {
    const client = getBambooClientForRequest(extra);
    const fields = await getTabularFieldsData(client);

    return {
      contents: [{
        uri: 'bamboohr://surface/tables',
        mimeType: 'application/json',
        text: JSON.stringify({
          commonHistoryTables: [...COMMON_HISTORY_TABLES],
          tabularFields: fields,
        }, null, 2),
      }],
    };
  });

  server.registerResource(
    'bamboohr-surface-dataset-fields',
    new ResourceTemplate('bamboohr://surface/datasets/{dataset}/fields', { list: undefined }),
    {
      title: 'BambooHR Dataset Fields',
      description: 'Template resource returning field metadata for a dataset.',
      mimeType: 'application/json',
    },
    async (_uri, variables, extra) => {
      const client = getBambooClientForRequest(extra);
      const dataset = Array.isArray(variables.dataset) ? variables.dataset[0] : variables.dataset;
      const fields = await getDatasetFieldsData(client, dataset);

      return {
        contents: [{
          uri: `bamboohr://surface/datasets/${encodeURIComponent(dataset)}/fields`,
          mimeType: 'application/json',
          text: JSON.stringify(fields, null, 2),
        }],
      };
    },
  );
}

export function registerSurfacePrompts(server: McpServer): void {
  server.registerPrompt('bamboohr-surface-orientation', {
    title: 'BambooHR Surface Orientation',
    description: 'Explains how to choose among the BambooHR tools, resources, and prompts.',
  }, async () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          'Use BambooHR datasets for bulk search, reporting-style queries, and agent-driven analytics.',
          'Use BambooHR employee tables for historical row data such as job info, compensation, and employment status.',
          'Use curated tools like `search-people` and `get-employee-history` when you want compact, agent-friendly output.',
          'Use time-off read tools to inspect requests and balances before using mutating tools.',
          'In streamable HTTP mode, BambooHR credentials are request-scoped and must be provided on each request.',
          'Mutating tools require `confirm=true` and only work when the server enables BambooHR mutations.',
        ].join(' '),
      },
    }],
  }));

  server.registerPrompt('bamboohr-people-analysis', {
    title: 'BambooHR People Analysis',
    description: 'Guides an agent through org and people analysis using the BambooHR surface.',
    argsSchema: {
      question: z.string().describe('The org or people analysis question to answer'),
    },
  }, async ({ question }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Answer this BambooHR people question: ${question}.`,
          'Prefer `search-people` for targeted person lookup and `query-dataset` against the account\'s employee dataset for broader analysis.',
          'Use `get-dataset-fields` first if field availability is unclear, and use `get-employee-history` when the question involves historical changes.',
          'Assume BambooHR credentials are request-scoped in HTTP mode.',
        ].join(' '),
      },
    }],
  }));

  server.registerPrompt('bamboohr-time-off-workflow', {
    title: 'BambooHR Time Off Workflow',
    description: 'Guides safe time-off inspection and mutation workflows.',
    argsSchema: {
      task: z.string().describe('The time-off task to complete'),
    },
  }, async ({ task }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Complete this BambooHR time-off task: ${task}.`,
          'Inspect first with `get-time-off-requests`, `estimate-time-off-balance`, `get-whos-out`, `list-time-off-policies`, or `get-employee-time-off-policies` before making changes.',
          'If a write is needed, only use `create-time-off-request` or `change-time-off-request-status` after confirming intent, and include `confirm=true`.',
          'Assume BambooHR credentials are request-scoped in HTTP mode and mutations may be disabled by server policy.',
        ].join(' '),
      },
    }],
  }));
}
