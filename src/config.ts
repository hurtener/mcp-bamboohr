import { config } from 'dotenv';

config();

export type BambooTransport = 'stdio' | 'streamable-http';

export interface BambooConfig {
  transport: BambooTransport;
  debug: boolean;
  enableMutations: boolean;
  apiToken?: string;
  companyDomain?: string;
  baseUrl?: string;
  httpHost: string;
  httpPort: number;
  httpPath: string;
  enableJsonResponse: boolean;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  enableDnsRebindingProtection: boolean;
}

export function normalizeCompanyDomain(input: string): string {
  const trimmed = input.trim();
  let hostOnly: string;

  if (/^https?:\/\//i.test(trimmed)) {
    hostOnly = new URL(trimmed).hostname;
  } else {
    const withoutPath = trimmed.split('/')[0];
    hostOnly = withoutPath.split(':')[0];
  }

  if (!hostOnly) {
    throw new Error('BAMBOO_COMPANY_DOMAIN environment variable is invalid');
  }

  return hostOnly.replace(/\.bamboohr\.com$/i, '');
}

export function buildBaseUrl(companyDomain: string): string {
  return `https://${normalizeCompanyDomain(companyDomain)}.bamboohr.com/api/v1`;
}

function parseTransport(value?: string): BambooTransport {
  switch (value?.trim().toLowerCase()) {
    case undefined:
    case '':
    case 'stdio':
      return 'stdio';
    case 'http':
    case 'streamable-http':
      return 'streamable-http';
    default:
      throw new Error('MCP transport must be either "stdio" or "streamable-http"');
  }
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('MCP_HTTP_PORT must be a positive integer');
  }

  return port;
}

function parseCsv(value?: string): string[] | undefined {
  const items = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items?.length ? items : undefined;
}

function normalizeHttpPath(value?: string): string {
  if (!value || value === '/') {
    return '/mcp';
  }

  return value.startsWith('/') ? value : `/${value}`;
}

function validateConfig(): BambooConfig {
  const transport = parseTransport(process.env.MCP_TRANSPORT ?? process.env.BAMBOO_TRANSPORT);
  const apiToken = process.env.BAMBOO_API_TOKEN?.trim() || undefined;
  const rawCompanyDomain = process.env.BAMBOO_COMPANY_DOMAIN?.trim() || undefined;
  const companyDomain = rawCompanyDomain ? normalizeCompanyDomain(rawCompanyDomain) : undefined;
  const debug = process.env.DEBUG === 'true';
  const enableMutations = process.env.BAMBOO_ENABLE_MUTATIONS === 'true';
  const httpHost = process.env.MCP_HTTP_HOST?.trim() || '0.0.0.0';
  const httpPort = parsePort(process.env.MCP_HTTP_PORT, 3000);
  const httpPath = normalizeHttpPath(process.env.MCP_HTTP_PATH);
  const enableJsonResponse = process.env.MCP_HTTP_ENABLE_JSON_RESPONSE === 'true';
  const allowedHosts = parseCsv(process.env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(process.env.MCP_ALLOWED_ORIGINS);
  const enableDnsRebindingProtection = process.env.MCP_ENABLE_DNS_REBINDING_PROTECTION === 'true';

  if (transport === 'stdio' && !apiToken) {
    throw new Error('BAMBOO_API_TOKEN environment variable is required for stdio transport');
  }

  if (transport === 'stdio' && !companyDomain) {
    throw new Error('BAMBOO_COMPANY_DOMAIN environment variable is required for stdio transport');
  }

  if ((apiToken && !companyDomain) || (!apiToken && companyDomain)) {
    throw new Error('BAMBOO_API_TOKEN and BAMBOO_COMPANY_DOMAIN must be provided together when using environment credentials');
  }

  const baseUrl = companyDomain ? buildBaseUrl(companyDomain) : undefined;

  return {
    transport,
    apiToken,
    companyDomain,
    baseUrl,
    debug,
    enableMutations,
    httpHost,
    httpPort,
    httpPath,
    enableJsonResponse,
    allowedHosts,
    allowedOrigins,
    enableDnsRebindingProtection,
  };
}

export const bambooConfig = validateConfig();
