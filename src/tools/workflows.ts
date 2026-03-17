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
