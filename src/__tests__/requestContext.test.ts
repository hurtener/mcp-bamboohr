jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('requestContext', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {};
    process.env.MCP_TRANSPORT = 'streamable-http';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should resolve credentials from HTTP headers', () => {
    const { resolveBambooCredentials } = require('../requestContext');

    const credentials = resolveBambooCredentials({
      requestInfo: {
        headers: {
          'x-bamboohr-api-key': 'header-token',
          'x-bamboohr-company-domain': 'acme',
        },
      },
    });

    expect(credentials).toEqual({
      apiToken: 'header-token',
      companyDomain: 'acme',
      baseUrl: 'https://acme.bamboohr.com/api/v1',
    });
  });

  it('should extract the API token from a Basic auth header', () => {
    const { resolveBambooCredentials } = require('../requestContext');
    const authorization = `Basic ${Buffer.from('basic-token:x').toString('base64')}`;

    const credentials = resolveBambooCredentials({
      requestInfo: {
        headers: {
          authorization,
          'x-bamboohr-company-domain': 'acme.bamboohr.com',
        },
      },
    });

    expect(credentials.apiToken).toBe('basic-token');
    expect(credentials.companyDomain).toBe('acme');
  });

  it('should normalize a company-domain header passed as a full BambooHR URL', () => {
    const { resolveBambooCredentials } = require('../requestContext');

    const credentials = resolveBambooCredentials({
      requestInfo: {
        headers: {
          'x-bamboohr-api-key': 'header-token',
          'x-bamboohr-company-domain': 'https://acme.bamboohr.com:443/api/v1',
        },
      },
    });

    expect(credentials.companyDomain).toBe('acme');
    expect(credentials.baseUrl).toBe('https://acme.bamboohr.com/api/v1');
  });

  it('should resolve credentials from MCP request metadata', () => {
    const { resolveBambooCredentials } = require('../requestContext');

    const credentials = resolveBambooCredentials({
      _meta: {
        bamboohr: {
          apiKey: 'meta-token',
          companyDomain: 'meta-company',
        },
      },
    });

    expect(credentials).toEqual({
      apiToken: 'meta-token',
      companyDomain: 'meta-company',
      baseUrl: 'https://meta-company.bamboohr.com/api/v1',
    });
  });

  it('should fall back to environment credentials when request credentials are absent', () => {
    process.env.BAMBOO_API_TOKEN = 'env-token';
    process.env.BAMBOO_COMPANY_DOMAIN = 'env-company';

    const { resolveBambooCredentials } = require('../requestContext');
    const credentials = resolveBambooCredentials();

    expect(credentials).toEqual({
      apiToken: 'env-token',
      companyDomain: 'env-company',
      baseUrl: 'https://env-company.bamboohr.com/api/v1',
    });
  });

  it('should throw a clear error when no credentials are available', () => {
    const { resolveBambooCredentials } = require('../requestContext');

    expect(() => resolveBambooCredentials()).toThrow(
      'BambooHR credentials are required. Provide x-bamboohr-api-key and x-bamboohr-company-domain headers, Authorization: Basic <base64(apiKey:x)>, or MCP _meta.bamboohr.{apiKey,companyDomain}.',
    );
  });
});
