import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { bambooConfig, buildBaseUrl, normalizeCompanyDomain } from './config.js';
import { BambooHRClient } from './bambooClient.js';

type BambooMeta = {
  bamboohr?: {
    apiKey?: unknown;
    apiToken?: unknown;
    companyDomain?: unknown;
    companySubdomain?: unknown;
  };
  bamboohrApiKey?: unknown;
  bamboohrApiToken?: unknown;
  bamboohrCompanyDomain?: unknown;
  bamboohrCompanySubdomain?: unknown;
};

export interface BambooRequestContext {
  requestInfo?: RequestInfo;
  _meta?: unknown;
}

export interface BambooRequestCredentials {
  apiToken: string;
  companyDomain: string;
  baseUrl: string;
}

function readHeader(headers: RequestInfo['headers'] | undefined, name: string): string | undefined {
  const value = headers?.[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function readStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function readMetaString(meta: BambooMeta | undefined, keys: string[]): string | undefined {
  const nested = meta?.bamboohr as Record<string, unknown> | undefined;

  for (const key of keys) {
    const value = readStringValue(nested?.[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readTopLevelMetaString(meta: BambooMeta | undefined, keys: string[]): string | undefined {
  const topLevel = meta as Record<string, unknown> | undefined;

  for (const key of keys) {
    const value = readStringValue(topLevel?.[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractApiTokenFromAuthorizationHeader(authorizationHeader?: string): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, encodedCredentials] = authorizationHeader.split(/\s+/, 2);

  if (!scheme || scheme.toLowerCase() !== 'basic' || !encodedCredentials) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
    return username.trim() || undefined;
  } catch {
    return undefined;
  }
}

function readMeta(meta: unknown): BambooMeta | undefined {
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  return meta as BambooMeta;
}

export function resolveBambooCredentials(context?: BambooRequestContext): BambooRequestCredentials {
  const meta = readMeta(context?._meta);
  const headers = context?.requestInfo?.headers;

  const apiToken = readMetaString(meta, ['apiKey', 'apiToken'])
    ?? readTopLevelMetaString(meta, ['bamboohrApiKey', 'bamboohrApiToken'])
    ?? readHeader(headers, 'x-bamboohr-api-key')
    ?? readHeader(headers, 'x-bamboohr-api-token')
    ?? extractApiTokenFromAuthorizationHeader(readHeader(headers, 'authorization'))
    ?? bambooConfig.apiToken;

  const companyDomain = readMetaString(meta, ['companyDomain', 'companySubdomain'])
    ?? readTopLevelMetaString(meta, ['bamboohrCompanyDomain', 'bamboohrCompanySubdomain'])
    ?? readHeader(headers, 'x-bamboohr-company-domain')
    ?? readHeader(headers, 'x-bamboohr-company-subdomain')
    ?? bambooConfig.companyDomain;

  if (!apiToken || !companyDomain) {
    throw new Error(
      'BambooHR credentials are required. Provide x-bamboohr-api-key and x-bamboohr-company-domain headers, ' +
      'Authorization: Basic <base64(apiKey:x)>, or MCP _meta.bamboohr.{apiKey,companyDomain}.',
    );
  }

  const normalizedCompanyDomain = normalizeCompanyDomain(companyDomain);

  return {
    apiToken,
    companyDomain: normalizedCompanyDomain,
    baseUrl: buildBaseUrl(normalizedCompanyDomain),
  };
}

export function getBambooClientForRequest(context?: BambooRequestContext): BambooHRClient {
  const credentials = resolveBambooCredentials(context);

  return new BambooHRClient({
    apiToken: credentials.apiToken,
    baseUrl: credentials.baseUrl,
    debug: bambooConfig.debug,
  });
}
