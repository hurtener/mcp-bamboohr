# BambooHR MCP Server

[![npm version](https://badge.fury.io/js/%40hurtener%2Fmcp-bamboohr.svg)](https://badge.fury.io/js/%40hurtener%2Fmcp-bamboohr)
[![Publish](https://github.com/hurtener/mcp-bamboohr/actions/workflows/publish.yml/badge.svg)](https://github.com/hurtener/mcp-bamboohr/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@hurtener/mcp-bamboohr` is a Model Context Protocol server for BambooHR. It supports classic `stdio` usage for single-user desktop clients and stateless streamable HTTP for shared sidecar deployments where BambooHR credentials are supplied on each request.

## What It Covers

- Employee profiles, photos, directory, and goals
- Time-off balances, requests, policy reads, and guarded write actions
- Company files and BambooHR metadata
- Datasets, field discovery, history tables, and changed-record feeds
- Curated workflow tools for people search and employee history
- MCP resources and prompts that explain the surface to downstream agents

## Installation

### From npm

```bash
npm install -g @hurtener/mcp-bamboohr
```

### From source

```bash
git clone https://github.com/hurtener/mcp-bamboohr.git
cd mcp-bamboohr
npm install
npm run build
```

## Running The Server

### `stdio` transport

Use this for per-user desktop MCP clients.

```json
{
  "mcpServers": {
    "bamboohr": {
      "command": "npx",
      "args": ["@hurtener/mcp-bamboohr@latest"],
      "type": "stdio",
      "env": {
        "BAMBOO_API_TOKEN": "your_api_key",
        "BAMBOO_COMPANY_DOMAIN": "your_subdomain"
      }
    }
  }
}
```

### Streamable HTTP sidecar

Use this for one shared sidecar serving many users. Credentials are resolved per request.

```bash
MCP_TRANSPORT=streamable-http \
MCP_HTTP_HOST=0.0.0.0 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_PATH=/mcp \
BAMBOO_ENABLE_MUTATIONS=false \
npx @hurtener/mcp-bamboohr@latest
```

Endpoints:

- `POST /mcp` for MCP streamable HTTP
- `GET /health` for health checks

## Auth Model

In streamable HTTP mode, BambooHR credentials are request-scoped. The server resolves them in this order:

1. MCP `_meta.bamboohr.{apiKey|apiToken, companyDomain|companySubdomain}`
2. MCP `_meta.bamboohrApiKey`, `_meta.bamboohrApiToken`, `_meta.bamboohrCompanyDomain`, `_meta.bamboohrCompanySubdomain`
3. `x-bamboohr-api-key` or `x-bamboohr-api-token` plus `x-bamboohr-company-domain`
4. `Authorization: Basic <base64(apiKey:x)>` plus `x-bamboohr-company-domain`
5. Environment fallback: `BAMBOO_API_TOKEN` and `BAMBOO_COMPANY_DOMAIN`

`BAMBOO_COMPANY_DOMAIN` can be either the BambooHR subdomain or a full BambooHR URL. The server normalizes it.

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `BAMBOO_API_TOKEN` | unset | Fallback BambooHR API key. Required in `stdio` mode. |
| `BAMBOO_COMPANY_DOMAIN` | unset | Fallback BambooHR company subdomain. Required in `stdio` mode. |
| `BAMBOO_ENABLE_MUTATIONS` | `false` | Enables write tools. |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `streamable-http`. |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP bind host. |
| `MCP_HTTP_PORT` | `3000` | HTTP bind port. |
| `MCP_HTTP_PATH` | `/mcp` | MCP HTTP path. |
| `MCP_HTTP_ENABLE_JSON_RESPONSE` | `false` | Enables JSON response mode in the MCP SDK transport. |
| `MCP_ALLOWED_HOSTS` | unset | Optional comma-separated host allowlist. |
| `MCP_ALLOWED_ORIGINS` | unset | Optional comma-separated origin allowlist. |
| `MCP_ENABLE_DNS_REBINDING_PROTECTION` | `false` | Enables SDK DNS rebinding protection. |
| `DEBUG` | `false` | Enables Bamboo client debug logging. |

## Tool Reference

The server currently exposes 26 tools.

### Employee tools

#### `get-employee`
Get a single employee record with selected fields.

```json
{
  "id": "0",
  "fields": "firstName,lastName,email,jobTitle",
  "onlyCurrent": true
}
```

Returns a single BambooHR employee object.

#### `get-employee-photo`
Fetch an employee photo in a requested size.

```json
{
  "employeeId": "123",
  "size": "medium"
}
```

Returns base64 image data plus metadata.

#### `get-employee-directory`
Read the BambooHR employee directory when enabled in the account.

```json
{}
```

Returns the directory payload from BambooHR.

#### `get-employee-goals`
Fetch performance goals for an employee.

```json
{
  "employeeId": "123",
  "filter": "all"
}
```

Returns BambooHR goal objects and milestone data.

### Time-off tools

#### `estimate-time-off-balance`
Estimate future time-off balances for one employee.

```json
{
  "employeeId": "123",
  "date": "2026-12-31"
}
```

Returns balance projections by time-off type.

#### `get-time-off-requests`
List or filter BambooHR time-off requests.

```json
{
  "id": 456,
  "action": "view",
  "employeeId": "123",
  "start": "2026-01-01",
  "end": "2026-01-31",
  "status": "requested",
  "type": "vacation"
}
```

All fields are optional. Returns BambooHR time-off request objects.

#### `get-whos-out`
List upcoming time-off and holiday events.

```json
{
  "start": "2026-03-13",
  "end": "2026-03-27"
}
```

Returns a summary plus event list.

#### `list-time-off-policies`
List account-level BambooHR time-off policies.

```json
{}
```

Returns the BambooHR `meta/time_off/policies` response.

#### `get-employee-time-off-policies`
Fetch assigned policies for a specific employee using BambooHR v1.1 policy data.

```json
{
  "employeeId": "123"
}
```

Returns employee policy assignments and related policy metadata.

#### `create-time-off-request`
Create a BambooHR time-off request. This is mutating.

```json
{
  "employeeId": "123",
  "payload": {
    "status": "requested",
    "start": "2026-04-01",
    "end": "2026-04-02",
    "timeOffTypeId": "vacation"
  },
  "confirm": true
}
```

Requirements:

- `BAMBOO_ENABLE_MUTATIONS=true`
- `confirm=true`

The `payload` object is passed through to BambooHR.

#### `change-time-off-request-status`
Approve, deny, or cancel a BambooHR time-off request. This is mutating.

```json
{
  "requestId": "456",
  "action": "approve",
  "payload": {
    "note": "Approved"
  },
  "confirm": true
}
```

Requirements:

- `BAMBOO_ENABLE_MUTATIONS=true`
- `confirm=true`

`action` must be one of `approve`, `deny`, or `cancel`.

#### `add-time-off-history-item`
Add a BambooHR time-off history item for an employee. This is mutating.

```json
{
  "employeeId": "123",
  "payload": {
    "date": "2026-04-01",
    "amount": "8.0",
    "note": "Manual adjustment"
  },
  "confirm": true
}
```

Requirements:

- `BAMBOO_ENABLE_MUTATIONS=true`
- `confirm=true`

Returns the BambooHR response status, `Location` header when present, and response body.

#### `assign-employee-time-off-policies`
Assign or unassign BambooHR time-off policies for an employee. This is mutating.

```json
{
  "employeeId": "123",
  "assignments": [
    {
      "timeOffPolicyId": 9,
      "accrualStartDate": "2026-01-01"
    },
    {
      "timeOffPolicyId": 12,
      "accrualStartDate": null
    }
  ],
  "confirm": true
}
```

Requirements:

- `BAMBOO_ENABLE_MUTATIONS=true`
- `confirm=true`

Use `accrualStartDate: null` to unassign a policy.

### File and metadata tools

#### `list-company-files`
List company file categories and files.

```json
{}
```

Returns BambooHR category and file metadata.

#### `get-company-file`
Fetch a company file or file metadata by ID.

```json
{
  "fileId": "789"
}
```

Returns base64 content when binary retrieval succeeds, otherwise JSON metadata.

#### `get-meta-fields`
List BambooHR field definitions available to the current account.

```json
{}
```

Returns the BambooHR `meta/fields` payload.

### Dataset and history tools

#### `list-datasets`
List BambooHR datasets available to the current credential.

```json
{}
```

Returns dataset definitions such as names, labels, and descriptions.

#### `get-dataset-fields`
List fields exposed by one dataset.

```json
{
  "datasetName": "employee"
}
```

Returns dataset field metadata.

#### `get-dataset-field-options`
Retrieve filter option values for one dataset.

```json
{
  "datasetName": "employee",
  "fields": ["department", "location"],
  "filters": {
    "status": "Active"
  }
}
```

Alternative raw form:

```json
{
  "datasetName": "employee",
  "request": {
    "fields": ["department"],
    "filters": {
      "status": "Active"
    }
  }
}
```

#### `query-dataset`
Execute a structured BambooHR dataset query.

```json
{
  "datasetName": "employee",
  "query": {
    "fields": ["id", "displayName", "department", "location"],
    "filters": {
      "status": "Active"
    },
    "sortBy": [
      {
        "field": "displayName",
        "direction": "asc"
      }
    ],
    "groupBy": ["department"],
    "aggregations": {
      "count": {
        "field": "id"
      }
    },
    "showHistory": false
  }
}
```

`query` is passthrough-friendly and accepts additional BambooHR dataset query keys.

#### `get-tabular-fields`
List BambooHR tabular field metadata.

```json
{}
```

Returns account table and field definitions.

#### `get-employee-table`
Fetch rows from one BambooHR employee table.

```json
{
  "employeeId": "123",
  "table": "jobInfo"
}
```

Returns the table rows as BambooHR provides them.

#### `get-changed-employee-ids`
List employees changed since a point in time.

```json
{
  "since": "2026-03-01T00:00:00Z",
  "params": {
    "type": "employee"
  }
}
```

Both fields are optional. `params` is merged into the query string.

#### `get-changed-table-rows`
List changed rows for one BambooHR table since a point in time.

```json
{
  "table": "jobInfo",
  "since": "2026-03-01T00:00:00Z",
  "params": {
    "type": "inserted"
  }
}
```

`params` is merged into the query string.

### Curated workflow tools

#### `search-people`
Curated people search over the account's employee dataset.

```json
{
  "query": "sarah engineering",
  "employeeId": "123",
  "department": "Engineering",
  "manager": "Alex",
  "location": "Remote",
  "status": "Active",
  "limit": 20
}
```

All filters are optional. Returns compact employee cards.

#### `get-employee-history`
Aggregate employee history tables with partial failure handling.

```json
{
  "employeeId": "123",
  "tables": ["jobInfo", "compensation", "employmentStatus"]
}
```

When `tables` is omitted, the default is `jobInfo`, `compensation`, and `employmentStatus`.

## Resources

### `bamboohr://surface/catalog`
Static markdown catalog for tools, prompts, resources, auth guidance, and routing guidance.

### `bamboohr://surface/datasets`
Dynamic JSON listing datasets visible to the current BambooHR credential.

### `bamboohr://surface/datasets/{dataset}/fields`
Dynamic JSON field metadata for a dataset.

### `bamboohr://surface/tables`
Dynamic JSON listing common history tables plus discovered tabular fields.

## Prompts

### `bamboohr-surface-orientation`
No arguments. Explains how to choose among datasets, tables, curated tools, and time-off writes.

### `bamboohr-people-analysis`

```json
{
  "question": "Which active employees are in Engineering in Buenos Aires?"
}
```

Guides an agent toward `search-people`, `query-dataset`, and `get-employee-history`.

### `bamboohr-time-off-workflow`

```json
{
  "task": "Review pending requests and approve the one for employee 123 if balance is sufficient."
}
```

Guides inspect-first time-off workflows and reminds agents that writes need `confirm=true`.

## Publishing To npm

The repository includes a GitHub Actions workflow at `.github/workflows/publish.yml`.

Behavior:

- Runs on every push to `main`
- Installs dependencies with `npm ci`
- Runs `npm test -- --runInBand`
- Runs `npm run build`
- Publishes to npm with `npm publish --access public` when the current package version is not already present on npm

The workflow expects a GitHub repository secret named `npm_token`.

## Development

```bash
npm run build
npm test -- --runInBand
npm run dev
```

## Maintainers

- hurtener (Santiago Benvenuto)
- OpenAI Codex

## License

MIT, copyright hurtener 2026. See [LICENSE](LICENSE).
