import { z } from 'zod';
import {
  COMMON_HISTORY_TABLES,
  extractDatasetRows,
  getEmployeeTableData,
  listDatasetsData,
  queryDatasetData,
  resolveEmployeeDatasetName,
} from '../bambooData.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';
import { errorTextResult, jsonTextResult } from '../toolUtils.js';
import type { Employee, EmployeeDirectory } from '../types.js';

function rowMatchesSearch(row: Record<string, any>, params: z.infer<typeof searchPeopleSchema>): boolean {
  const haystack = [
    row.displayName,
    row.firstName,
    row.lastName,
    row.jobTitle,
    row.department,
    row.location,
    row.supervisor,
    row.manager,
    row.workEmail,
    row.status,
    row.id,
    row.employeeId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasGeneralMatch = !params.query || haystack.includes(params.query.toLowerCase());
  const matchesEmployeeId = !params.employeeId || `${row.id ?? row.employeeId ?? ''}` === params.employeeId;
  const matchesStatus = !params.status || `${row.status ?? ''}`.toLowerCase().includes(params.status.toLowerCase());
  const matchesDepartment = !params.department || `${row.department ?? ''}`.toLowerCase().includes(params.department.toLowerCase());
  const matchesManager = !params.manager || `${row.supervisor ?? row.manager ?? ''}`.toLowerCase().includes(params.manager.toLowerCase());
  const matchesLocation = !params.location || `${row.location ?? ''}`.toLowerCase().includes(params.location.toLowerCase());

  return hasGeneralMatch && matchesEmployeeId && matchesStatus && matchesDepartment && matchesManager && matchesLocation;
}

function toEmployeeCard(row: Record<string, any>) {
  return {
    id: row.id ?? row.employeeId ?? null,
    displayName: row.displayName ?? ([row.firstName, row.lastName].filter(Boolean).join(' ') || null),
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    workEmail: row.workEmail ?? row.email ?? null,
    jobTitle: row.jobTitle ?? null,
    department: row.department ?? null,
    location: row.location ?? null,
    manager: row.supervisor ?? row.manager ?? null,
    status: row.status ?? null,
  };
}

function extractEmployeeId(row: Record<string, any>): string | null {
  const id = row.id ?? row.employeeId;
  return id != null ? String(id) : null;
}

function extractSupervisorId(row: Record<string, any>): string | null {
  const id = row.supervisorId ?? row.supervisorEId ?? row.managerId;
  return id != null ? String(id) : null;
}

function toEmployeeNode(row: Record<string, any>) {
  return {
    ...toEmployeeCard(row),
    managerId: extractSupervisorId(row),
  };
}

function isDirectoryFallbackCandidate(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';

  return message.includes('Access forbidden') || message.includes('Resource not found');
}

async function searchPeopleViaDirectory(
  params: z.infer<typeof searchPeopleSchema>,
  context?: BambooRequestContext,
) {
  const client = getBambooClientForRequest(context);
  const response = await client.get<EmployeeDirectory>('/employees/directory');
  const rows = (response.employees ?? [])
    .filter((row: Employee) => rowMatchesSearch(row, params))
    .slice(0, params.limit ?? 20)
    .map(toEmployeeCard);

  return {
    source: 'directory',
    count: rows.length,
    filtersApplied: {
      query: params.query ?? null,
      employeeId: params.employeeId ?? null,
      department: params.department ?? null,
      manager: params.manager ?? null,
      location: params.location ?? null,
      status: params.status ?? null,
    },
    employees: rows,
  };
}

async function searchPeopleViaDataset(
  params: z.infer<typeof searchPeopleSchema>,
  context?: BambooRequestContext,
) {
  const client = getBambooClientForRequest(context);
  const datasets = await listDatasetsData(client);
  const employeeDatasetName = resolveEmployeeDatasetName(datasets);
  const response = await queryDatasetData(client, employeeDatasetName, {
    fields: [
      'id',
      'displayName',
      'firstName',
      'lastName',
      'workEmail',
      'jobTitle',
      'department',
      'location',
      'supervisor',
      'status',
    ],
    showHistory: false,
  });

  const rows = extractDatasetRows(response)
    .filter((row) => rowMatchesSearch(row, params))
    .slice(0, params.limit ?? 20)
    .map(toEmployeeCard);

  return {
    source: 'dataset',
    dataset: employeeDatasetName,
    count: rows.length,
    filtersApplied: {
      query: params.query ?? null,
      employeeId: params.employeeId ?? null,
      department: params.department ?? null,
      manager: params.manager ?? null,
      location: params.location ?? null,
      status: params.status ?? null,
    },
    employees: rows,
  };
}

export const searchPeopleSchema = z.object({
  query: z.string().optional().describe('Free-text search across common employee identity fields'),
  employeeId: z.string().optional().describe('Exact employee ID to match'),
  department: z.string().optional().describe('Department filter'),
  manager: z.string().optional().describe('Manager or supervisor name filter'),
  location: z.string().optional().describe('Location filter'),
  status: z.string().optional().describe('Employment status filter'),
  limit: z.number().int().positive().max(100).default(20).optional().describe('Maximum number of employee cards to return'),
});

export async function searchPeople(params: z.infer<typeof searchPeopleSchema>, extra?: BambooRequestContext) {
  try {
    try {
      const response = await searchPeopleViaDirectory(params, extra);
      return jsonTextResult(response);
    } catch (directoryError) {
      if (!isDirectoryFallbackCandidate(directoryError)) {
        throw directoryError;
      }

      const response = await searchPeopleViaDataset(params, extra);
      return jsonTextResult(response);
    }
  } catch (error) {
    return errorTextResult('Error searching people', error);
  }
}

type EmployeeRowsSource = {
  source: 'directory' | 'dataset';
  dataset?: string;
  rows: Array<Record<string, any>>;
};

async function loadAllEmployeeRows(context?: BambooRequestContext): Promise<EmployeeRowsSource> {
  const client = getBambooClientForRequest(context);

  try {
    const response = await client.get<EmployeeDirectory>('/employees/directory');
    return { source: 'directory', rows: response.employees ?? [] };
  } catch (directoryError) {
    if (!isDirectoryFallbackCandidate(directoryError)) {
      throw directoryError;
    }

    const datasets = await listDatasetsData(client);
    const employeeDatasetName = resolveEmployeeDatasetName(datasets);
    const response = await queryDatasetData(client, employeeDatasetName, {
      fields: [
        'id',
        'displayName',
        'firstName',
        'lastName',
        'workEmail',
        'jobTitle',
        'department',
        'location',
        'supervisor',
        'supervisorEId',
        'status',
      ],
      showHistory: false,
    });

    return {
      source: 'dataset',
      dataset: employeeDatasetName,
      rows: extractDatasetRows(response),
    };
  }
}

export const getDirectReportsSchema = z.object({
  employeeId: z.string().describe('Employee ID of the manager whose direct reports you want.'),
  status: z.string().optional().describe('Optional employment status filter (substring match, e.g., "Active").'),
  limit: z.number().int().positive().max(500).default(100).optional().describe('Maximum number of direct reports to return. Defaults to 100.'),
});

export async function getDirectReports(params: z.infer<typeof getDirectReportsSchema>, extra?: BambooRequestContext) {
  try {
    const { source, dataset, rows } = await loadAllEmployeeRows(extra);
    const targetId = String(params.employeeId);
    const limit = params.limit ?? 100;
    const statusFilter = params.status?.toLowerCase();

    const matches = rows.filter((row) => extractSupervisorId(row) === targetId);
    const filtered = statusFilter
      ? matches.filter((row) => `${row.status ?? ''}`.toLowerCase().includes(statusFilter))
      : matches;

    const directReports = filtered.slice(0, limit).map(toEmployeeNode);

    return jsonTextResult({
      source,
      ...(dataset ? { dataset } : {}),
      managerId: targetId,
      count: directReports.length,
      totalMatching: filtered.length,
      truncated: filtered.length > directReports.length,
      filtersApplied: { status: params.status ?? null },
      directReports,
    });
  } catch (error) {
    return errorTextResult('Error getting direct reports', error);
  }
}

export const getOrgSubtreeSchema = z.object({
  employeeId: z.string().describe('Root employee ID; the subtree returned is rooted here.'),
  maxDepth: z.number().int().min(1).max(10).default(3).optional().describe('Maximum recursion depth. 1 returns the root plus direct reports only. Defaults to 3.'),
  status: z.string().optional().describe('Optional employment status filter (substring match) applied to descendants.'),
  maxNodes: z.number().int().positive().max(5000).default(500).optional().describe('Hard cap on the total number of nodes returned including the root. Defaults to 500.'),
});

export async function getOrgSubtree(params: z.infer<typeof getOrgSubtreeSchema>, extra?: BambooRequestContext) {
  try {
    const { source, dataset, rows } = await loadAllEmployeeRows(extra);
    const targetId = String(params.employeeId);
    const maxDepth = params.maxDepth ?? 3;
    const maxNodes = params.maxNodes ?? 500;
    const statusFilter = params.status?.toLowerCase();

    const byId = new Map<string, Record<string, any>>();
    const childrenByManager = new Map<string, Array<Record<string, any>>>();

    for (const row of rows) {
      const id = extractEmployeeId(row);
      if (id) {
        byId.set(id, row);
      }
      const managerId = extractSupervisorId(row);
      if (managerId) {
        const list = childrenByManager.get(managerId) ?? [];
        list.push(row);
        childrenByManager.set(managerId, list);
      }
    }

    const root = byId.get(targetId);
    if (!root) {
      return jsonTextResult({
        source,
        ...(dataset ? { dataset } : {}),
        rootEmployeeId: targetId,
        found: false,
        message: 'Employee not found in the directory or employee dataset.',
        tree: null,
      });
    }

    const visited = new Set<string>();
    let truncated = false;
    let nodeCount = 0;

    function build(row: Record<string, any>, depth: number): Record<string, any> | null {
      if (nodeCount >= maxNodes) {
        truncated = true;
        return null;
      }

      const id = extractEmployeeId(row) ?? '';
      if (id && visited.has(id)) {
        truncated = true;
        return null;
      }
      if (id) {
        visited.add(id);
      }
      nodeCount += 1;

      const node: Record<string, any> = toEmployeeNode(row);
      const allChildren = id ? (childrenByManager.get(id) ?? []) : [];
      const matchedChildren = statusFilter
        ? allChildren.filter((child) => `${child.status ?? ''}`.toLowerCase().includes(statusFilter))
        : allChildren;

      if (depth < maxDepth) {
        const builtChildren: Array<Record<string, any>> = [];
        for (const child of matchedChildren) {
          const built = build(child, depth + 1);
          if (built) {
            builtChildren.push(built);
          }
        }
        node.directReports = builtChildren;
        node.directReportCount = builtChildren.length;
        if (builtChildren.length < matchedChildren.length) {
          truncated = true;
        }
      } else {
        node.directReports = [];
        node.directReportCount = matchedChildren.length;
        if (matchedChildren.length > 0) {
          truncated = true;
        }
      }

      return node;
    }

    const tree = build(root, 0);

    return jsonTextResult({
      source,
      ...(dataset ? { dataset } : {}),
      rootEmployeeId: targetId,
      maxDepth,
      maxNodes,
      totalNodes: nodeCount,
      truncated,
      filtersApplied: { status: params.status ?? null },
      tree,
    });
  } catch (error) {
    return errorTextResult('Error building org subtree', error);
  }
}

export const getEmployeeHistorySchema = z.object({
  employeeId: z.string().describe('The employee ID to inspect'),
  tables: z.array(z.string()).default([...COMMON_HISTORY_TABLES]).optional().describe('Employee history tables to aggregate'),
});

export async function getEmployeeHistory(params: z.infer<typeof getEmployeeHistorySchema>, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const tables = params.tables ?? [...COMMON_HISTORY_TABLES];
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          return {
            table,
            data: await getEmployeeTableData(client, params.employeeId, table),
          };
        } catch (error) {
          return {
            table,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    const history: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    for (const result of results) {
      if ('error' in result) {
        errors[result.table] = result.error ?? 'Unknown error';
      } else {
        history[result.table] = result.data;
      }
    }

    return jsonTextResult({
      employeeId: params.employeeId,
      tablesRequested: tables,
      history,
      ...(Object.keys(errors).length ? { errors } : {}),
    });
  } catch (error) {
    return errorTextResult('Error getting employee history', error);
  }
}
