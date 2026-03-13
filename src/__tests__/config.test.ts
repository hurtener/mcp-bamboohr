// Mock dotenv to prevent it from loading .env file
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('stdio transport', () => {
    it('should load stdio config from environment variables', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      process.env.DEBUG = 'true';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.transport).toBe('stdio');
      expect(bambooConfig.apiToken).toBe('test-token-123');
      expect(bambooConfig.companyDomain).toBe('test-company');
      expect(bambooConfig.baseUrl).toBe('https://test-company.bamboohr.com/api/v1');
      expect(bambooConfig.debug).toBe(true);
      expect(bambooConfig.enableMutations).toBe(false);
    });

    it('should default debug to false', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      // Don't set DEBUG

      const { bambooConfig } = require('../config');

      expect(bambooConfig.debug).toBe(false);
    });

    it('should normalize a full BambooHR URL into the company domain', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'https://test-company.bamboohr.com/api/v1';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.companyDomain).toBe('test-company');
      expect(bambooConfig.baseUrl).toBe('https://test-company.bamboohr.com/api/v1');
    });

    it('should normalize a BambooHR URL that includes a port', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'https://test-company.bamboohr.com:443/api/v1';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.companyDomain).toBe('test-company');
      expect(bambooConfig.baseUrl).toBe('https://test-company.bamboohr.com/api/v1');
    });
  });

  describe('streamable HTTP transport', () => {
    it('should allow startup without Bamboo credentials', () => {
      process.env.MCP_TRANSPORT = 'streamable-http';
      process.env.MCP_HTTP_HOST = '127.0.0.1';
      process.env.MCP_HTTP_PORT = '4123';
      process.env.MCP_HTTP_PATH = 'bamboo';
      process.env.MCP_HTTP_ENABLE_JSON_RESPONSE = 'true';
      process.env.BAMBOO_ENABLE_MUTATIONS = 'true';
      process.env.MCP_ALLOWED_HOSTS = 'localhost,example.internal';
      process.env.MCP_ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.MCP_ENABLE_DNS_REBINDING_PROTECTION = 'true';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.transport).toBe('streamable-http');
      expect(bambooConfig.apiToken).toBeUndefined();
      expect(bambooConfig.companyDomain).toBeUndefined();
      expect(bambooConfig.httpHost).toBe('127.0.0.1');
      expect(bambooConfig.httpPort).toBe(4123);
      expect(bambooConfig.httpPath).toBe('/bamboo');
      expect(bambooConfig.enableJsonResponse).toBe(true);
      expect(bambooConfig.enableMutations).toBe(true);
      expect(bambooConfig.allowedHosts).toEqual(['localhost', 'example.internal']);
      expect(bambooConfig.allowedOrigins).toEqual(['https://app.example.com']);
      expect(bambooConfig.enableDnsRebindingProtection).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error when API token is missing in stdio mode', () => {
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';

      expect(() => {
        require('../config');
      }).toThrow('BAMBOO_API_TOKEN environment variable is required for stdio transport');
    });

    it('should throw error when company domain is missing in stdio mode', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';

      expect(() => {
        require('../config');
      }).toThrow('BAMBOO_COMPANY_DOMAIN environment variable is required for stdio transport');
    });

    it('should throw error when environment credentials are only partially configured', () => {
      process.env.MCP_TRANSPORT = 'streamable-http';
      process.env.BAMBOO_API_TOKEN = 'test-token-123';

      expect(() => {
        require('../config');
      }).toThrow('BAMBOO_API_TOKEN and BAMBOO_COMPANY_DOMAIN must be provided together when using environment credentials');
    });

    it('should reject unsupported transports', () => {
      process.env.MCP_TRANSPORT = 'sse';

      expect(() => {
        require('../config');
      }).toThrow('MCP transport must be either "stdio" or "streamable-http"');
    });
  });
});
