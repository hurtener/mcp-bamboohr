# BambooHR MCP Server Reference

This document is the full operator reference for `@hurtener/mcp-bamboohr`.

## Package

- Package name: `@hurtener/mcp-bamboohr`
- Command name: `mcp-bamboohr`
- Repository: `https://github.com/hurtener/mcp-bamboohr`

## Transport Modes

### `stdio`

Use `stdio` when one MCP process is dedicated to one BambooHR credential.

Required environment variables:

- `BAMBOO_API_TOKEN`
- `BAMBOO_COMPANY_DOMAIN`

Example:

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

### Streamable HTTP

Use streamable HTTP when the server is deployed as a shared sidecar and BambooHR credentials are supplied on each request.

Example:

```bash
MCP_TRANSPORT=streamable-http \
MCP_HTTP_HOST=0.0.0.0 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_PATH=/mcp \
BAMBOO_ENABLE_MUTATIONS=false \
npx @hurtener/mcp-bamboohr@latest
```

Endpoints:

- `POST /mcp`
- `GET /health`

## Request-Scoped Auth

In HTTP mode, credentials are resolved in this order:

1. `_meta.bamboohr.apiKey` or `_meta.bamboohr.apiToken`
2. `_meta.bamboohr.companyDomain` or `_meta.bamboohr.companySubdomain`
3. `_meta.bamboohrApiKey`, `_meta.bamboohrApiToken`, `_meta.bamboohrCompanyDomain`, `_meta.bamboohrCompanySubdomain`
4. `x-bamboohr-api-key` or `x-bamboohr-api-token`
5. `Authorization: Basic <base64(apiKey:x)>`
6. `x-bamboohr-company-domain` or `x-bamboohr-company-subdomain`
7. Environment fallback with `BAMBOO_API_TOKEN` and `BAMBOO_COMPANY_DOMAIN`

Notes:

- `Authorization: Basic ...` only provides the API key portion. You still need the company-domain header unless environment fallback is present.
- `BAMBOO_COMPANY_DOMAIN` may be a BambooHR subdomain, hostname, or full URL. The server normalizes it.

## Environment Variables

| Variable | Default | Notes |
| --- | --- | --- |
| `BAMBOO_API_TOKEN` | unset | Fallback API key. Required for `stdio`. |
| `BAMBOO_COMPANY_DOMAIN` | unset | Fallback company domain. Required for `stdio`. |
| `BAMBOO_ENABLE_MUTATIONS` | `false` | Enables write tools. |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `streamable-http`. |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP bind address. |
| `MCP_HTTP_PORT` | `3000` | HTTP bind port. |
| `MCP_HTTP_PATH` | `/mcp` | HTTP transport path. |
| `MCP_HTTP_ENABLE_JSON_RESPONSE` | `false` | Passes `enableJsonResponse` to the MCP transport. |
| `MCP_ALLOWED_HOSTS` | unset | Optional comma-separated allowlist. |
| `MCP_ALLOWED_ORIGINS` | unset | Optional comma-separated allowlist. |
| `MCP_ENABLE_DNS_REBINDING_PROTECTION` | `false` | Passes DNS rebinding protection to the MCP transport. |
| `DEBUG` | `false` | Enables Bamboo client debug logging. |

## Mutation Policy

Mutating tools fail closed unless both conditions are met:

1. `BAMBOO_ENABLE_MUTATIONS=true`
2. The tool input includes `confirm: true`

Current mutating tools:

- `create-time-off-request`
- `change-time-off-request-status`
- `add-time-off-history-item`
- `assign-employee-time-off-policies`

## Tool Surface

The server exposes 26 tools.

### Employee tools

#### `get-employee`

Description:
- Fetches one employee record with caller-selected fields.

Input shape:

```json
{
  "id": "0",
  "fields": "firstName,lastName,email,jobTitle",
  "onlyCurrent": true
}
```

Field notes:

- `id`: Employee ID. `"0"` means the current BambooHR user behind the API key.
- `fields`: Comma-separated BambooHR field IDs.
- `onlyCurrent`: Set `false` to include future-dated values from history-backed fields.

Returns:
- A single BambooHR employee object.

#### `get-employee-photo`

Description:
- Fetches an employee photo in a specific size.

Input shape:

```json
{
  "employeeId": "123",
  "size": "medium"
}
```

Allowed `size` values:
- `original`
- `large`
- `medium`
- `small`
- `xs`
- `tiny`

Returns:
- Base64 image data and byte count.

#### `get-employee-directory`

Description:
- Reads the BambooHR employee directory when enabled in the tenant.

Input shape:

```json
{}
```

Returns:
- The directory payload from BambooHR.

#### `get-employee-goals`

Description:
- Fetches performance goals for an employee.

Input shape:

```json
{
  "employeeId": "123",
  "filter": "all"
}
```

Allowed `filter` values:
- `open`
- `closed`
- `all`

Returns:
- Goal objects, progress data, and milestone information.

### Time-off tools

#### `estimate-time-off-balance`

Description:
- Estimates future balances for employee time-off types.

Input shape:

```json
{
  "employeeId": "123",
  "date": "2026-12-31"
}
```

Returns:
- Balance projections by time-off type.

#### `get-time-off-requests`

Description:
- Reads BambooHR time-off requests with optional filtering.

Input shape:

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

Allowed `action` values:
- `view`
- `approve`

Allowed `status` values:
- `approved`
- `denied`
- `superceded`
- `requested`
- `canceled`

Returns:
- BambooHR time-off request objects with actions, notes, and date allocations.

#### `get-whos-out`

Description:
- Lists upcoming time-off and holiday events.

Input shape:

```json
{
  "start": "2026-03-13",
  "end": "2026-03-27"
}
```

Returns:
- A summary object and event list.

#### `list-time-off-policies`

Description:
- Lists account-level policies from `/meta/time_off/policies`.

Input shape:

```json
{}
```

Returns:
- BambooHR time-off policy definitions.

#### `get-employee-time-off-policies`

Description:
- Fetches an employee's assigned policies from the BambooHR v1.1 endpoint.

Input shape:

```json
{
  "employeeId": "123"
}
```

Returns:
- Policy assignments and related policy metadata.

#### `create-time-off-request`

Description:
- Creates a BambooHR time-off request for one employee.
- Mutating tool.

Input shape:

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

Notes:

- `payload` is passed through directly to BambooHR.
- Requires `BAMBOO_ENABLE_MUTATIONS=true`.
- Requires `confirm=true`.

Returns:
- The BambooHR create-response payload.

#### `change-time-off-request-status`

Description:
- Approves, denies, or cancels a BambooHR time-off request.
- Mutating tool.

Input shape:

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

Allowed `action` values:
- `approve`
- `deny`
- `cancel`

Notes:

- `payload` may add extra BambooHR fields, but the server always forces `status` to the selected action.
- Requires `BAMBOO_ENABLE_MUTATIONS=true`.
- Requires `confirm=true`.

Returns:
- The BambooHR status-change response payload.

#### `add-time-off-history-item`

Description:
- Adds a BambooHR time-off history item for one employee.
- Mutating tool.

Input shape:

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

Notes:

- `payload` is passed through directly to BambooHR.
- Requires `BAMBOO_ENABLE_MUTATIONS=true`.
- Requires `confirm=true`.

Returns:
- An object with BambooHR `status`, optional `location`, and response `data`.

#### `assign-employee-time-off-policies`

Description:
- Assigns or unassigns BambooHR time-off policies for one employee.
- Mutating tool.

Input shape:

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

Notes:

- `assignments` is sent to BambooHR as-is.
- Use `accrualStartDate: null` to unassign a policy.
- Requires `BAMBOO_ENABLE_MUTATIONS=true`.
- Requires `confirm=true`.

Returns:
- The BambooHR policy-assignment response payload.

### File and metadata tools

#### `list-company-files`

Description:
- Lists BambooHR company file categories and files.

Input shape:

```json
{}
```

Returns:
- Category metadata and file metadata.

#### `get-company-file`

Description:
- Fetches a company file by ID.

Input shape:

```json
{
  "fileId": "789"
}
```

Returns:
- Base64 binary content when file download succeeds.
- JSON metadata when BambooHR returns a non-binary response.

#### `get-meta-fields`

Description:
- Lists BambooHR field definitions for the account.

Input shape:

```json
{}
```

Returns:
- Field definition objects with IDs, names, and types.

### Dataset and history tools

#### `list-datasets`

Description:
- Lists the datasets visible to the current BambooHR credential.

Input shape:

```json
{}
```

Returns:
- Dataset definitions, usually including names, labels, and descriptions.

#### `get-dataset-fields`

Description:
- Lists fields exposed by one dataset.

Input shape:

```json
{
  "datasetName": "employee"
}
```

Returns:
- Dataset field metadata.

#### `get-dataset-field-options`

Description:
- Retrieves filter options for a dataset.

Input shape:

```json
{
  "datasetName": "employee",
  "fields": ["department", "location"],
  "filters": {
    "status": "Active"
  }
}
```

Alternative raw-input shape:

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

Notes:

- If `request` is provided, the tool sends it as-is.
- If `request` is omitted, the tool builds a payload from `fields` and `filters`.

Returns:
- BambooHR dataset field-option data.

#### `query-dataset`

Description:
- Executes a structured query against a BambooHR dataset.

Input shape:

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

Notes:

- `query` explicitly supports `fields`, `filters`, `sortBy`, `groupBy`, `aggregations`, and `showHistory`.
- `query` is passthrough-friendly and accepts additional BambooHR keys.

Returns:
- The BambooHR dataset query response, close to upstream shape.

#### `get-tabular-fields`

Description:
- Lists BambooHR tabular field metadata from `/meta/tables`.

Input shape:

```json
{}
```

Returns:
- Table and field metadata for BambooHR tabular surfaces.

#### `get-employee-table`

Description:
- Fetches rows from one employee table such as `jobInfo` or `compensation`.

Input shape:

```json
{
  "employeeId": "123",
  "table": "jobInfo"
}
```

Returns:
- BambooHR table rows.

#### `get-changed-employee-ids`

Description:
- Lists employees changed since a point in time.

Input shape:

```json
{
  "since": "2026-03-01T00:00:00Z",
  "params": {
    "type": "employee"
  }
}
```

Notes:

- Both fields are optional.
- `params` is merged into the raw changed-employees query string.

Returns:
- BambooHR changed-employee feed data.

#### `get-changed-table-rows`

Description:
- Lists changed rows for one BambooHR table.

Input shape:

```json
{
  "table": "jobInfo",
  "since": "2026-03-01T00:00:00Z",
  "params": {
    "type": "inserted"
  }
}
```

Notes:

- `table` is required.
- `since` and `params` are optional.

Returns:
- BambooHR changed-table feed data.

### Curated workflow tools

#### `search-people`

Description:
- Performs an agent-friendly people search over the tenant's employee dataset.

Input shape:

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

Notes:

- All filters are optional.
- `limit` defaults to `20` and is capped at `100`.
- The tool discovers the account's employee dataset name instead of hardcoding one.

Returns:
- Compact employee cards with keys such as `id`, `displayName`, `workEmail`, `jobTitle`, `department`, `location`, `manager`, and `status`.

#### `get-employee-history`

Description:
- Aggregates employee history tables with partial failure handling.

Input shape:

```json
{
  "employeeId": "123",
  "tables": ["jobInfo", "compensation", "employmentStatus"]
}
```

Notes:

- `tables` defaults to `jobInfo`, `compensation`, and `employmentStatus`.
- If one table fails, the tool returns successful tables plus an `errors` object for failures.

Returns:
- An object with `employeeId`, `tablesRequested`, `history`, and optional `errors`.

## Resources

### `bamboohr://surface/catalog`

Type:
- `text/markdown`

Purpose:
- Static catalog of tools, prompts, resources, auth guidance, mutation policy, and routing guidance.

### `bamboohr://surface/datasets`

Type:
- `application/json`

Purpose:
- Lists datasets visible to the current request-scoped credential.

### `bamboohr://surface/datasets/{dataset}/fields`

Type:
- `application/json`

Purpose:
- Returns field metadata for a chosen dataset.

### `bamboohr://surface/tables`

Type:
- `application/json`

Purpose:
- Returns common history tables plus discovered tabular fields.

## Prompts

### `bamboohr-surface-orientation`

Arguments:

```json
{}
```

Purpose:
- Explains how to choose between datasets, employee tables, curated workflow tools, and time-off write tools.

### `bamboohr-people-analysis`

Arguments:

```json
{
  "question": "Which active employees in Engineering report to Alex?"
}
```

Purpose:
- Directs downstream agents toward `search-people`, `query-dataset`, `get-dataset-fields`, and `get-employee-history`.

### `bamboohr-time-off-workflow`

Arguments:

```json
{
  "task": "Review pending requests and approve the one for employee 123 if the balance is sufficient."
}
```

Purpose:
- Directs downstream agents to inspect first and only mutate when confirmation and mutation policy allow it.

## Release Automation

GitHub Actions workflow:
- `.github/workflows/publish.yml`

Behavior:
- Triggers on pushes to `main`
- Runs install, test, and build
- Publishes `@hurtener/mcp-bamboohr` to npm with `--access public`
- Skips publish when the version in `package.json` already exists on npm

Required secret:
- `npm_token`

## Maintainers

- hurtener (Santiago Benvenuto)
- OpenAI Codex

## License

MIT, copyright hurtener 2026.
