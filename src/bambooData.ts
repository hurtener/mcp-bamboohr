import { BambooHRClient, type BambooHRResponse } from './bambooClient.js';
import type {
  ChangedEmployeeIdsResponse,
  ChangedTableRowsResponse,
  DatasetDefinition,
  DatasetDefinitions,
  DatasetFieldDefinitions,
  DatasetFieldOptionsResponse,
  DatasetQueryResponse,
  EmployeeTimeOffPoliciesResponse,
  TimeOffPoliciesResponse,
  TabularFieldDefinitions,
} from './types.js';

export const COMMON_HISTORY_TABLES = ['jobInfo', 'compensation', 'employmentStatus'] as const;

function buildV11Url(client: BambooHRClient, path: string): string {
  return `${client.getBaseUrl().replace(/\/api\/v1$/, '/api/v1_1')}${path}`;
}

export function extractDatasetRows(response: DatasetQueryResponse): any[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  if (Array.isArray(response.employees)) {
    return response.employees;
  }

  if (Array.isArray(response.records)) {
    return response.records;
  }

  return [];
}

export async function listDatasetsData(client: BambooHRClient): Promise<DatasetDefinitions> {
  return client.get<DatasetDefinitions>('/datasets');
}

function getDatasetName(dataset: DatasetDefinition): string | undefined {
  if (typeof dataset.name === 'string' && dataset.name.trim()) {
    return dataset.name.trim();
  }

  if (typeof dataset.id === 'string' && dataset.id.trim()) {
    return dataset.id.trim();
  }

  return undefined;
}

export function resolveEmployeeDatasetName(datasets: DatasetDefinitions): string {
  const datasetContainer = datasets as DatasetDefinitions | DatasetDefinition[];
  const availableDatasets: DatasetDefinition[] = Array.isArray((datasetContainer as DatasetDefinitions).datasets)
    ? (datasetContainer as DatasetDefinitions).datasets
    : Array.isArray(datasets)
      ? (datasets as DatasetDefinition[])
      : [];
  const normalized: Array<{ original: DatasetDefinition; name?: string; label?: string }> = availableDatasets
    .map((dataset) => ({
      original: dataset,
      name: getDatasetName(dataset),
      label: typeof dataset.label === 'string' ? dataset.label.trim().toLowerCase() : undefined,
    }))
    .filter((dataset) => Boolean(dataset.name));

  const exactMatch = normalized.find((dataset) => dataset.name?.toLowerCase() === 'employee')
    ?? normalized.find((dataset) => dataset.name?.toLowerCase() === 'employees');

  if (exactMatch?.name) {
    return exactMatch.name;
  }

  const labelMatch = normalized.find((dataset) => dataset.label === 'employee')
    ?? normalized.find((dataset) => dataset.label === 'employees');

  if (labelMatch?.name) {
    return labelMatch.name;
  }

  throw new Error('Could not determine the BambooHR employee dataset. Use list-datasets to inspect the available dataset names for this account.');
}

export async function getDatasetFieldsData(client: BambooHRClient, datasetName: string): Promise<DatasetFieldDefinitions> {
  return client.get<DatasetFieldDefinitions>(`/datasets/${encodeURIComponent(datasetName)}/fields`);
}

export async function getDatasetFieldOptionsData(
  client: BambooHRClient,
  datasetName: string,
  request: Record<string, unknown>,
): Promise<DatasetFieldOptionsResponse> {
  return client.post<DatasetFieldOptionsResponse>(`/datasets/${encodeURIComponent(datasetName)}/field-options`, request);
}

export async function queryDatasetData(
  client: BambooHRClient,
  datasetName: string,
  query: Record<string, unknown>,
): Promise<DatasetQueryResponse> {
  return client.post<DatasetQueryResponse>(`/datasets/${encodeURIComponent(datasetName)}`, query);
}

export async function getTabularFieldsData(client: BambooHRClient): Promise<TabularFieldDefinitions> {
  return client.get<TabularFieldDefinitions>('/meta/tables');
}

export async function getEmployeeTableData(
  client: BambooHRClient,
  employeeId: string,
  table: string,
): Promise<unknown> {
  return client.get(`/employees/${employeeId}/tables/${encodeURIComponent(table)}`);
}

export async function getChangedEmployeeIdsData(
  client: BambooHRClient,
  params?: Record<string, unknown>,
): Promise<ChangedEmployeeIdsResponse> {
  return client.get<ChangedEmployeeIdsResponse>('/employees/changed', params);
}

export async function getChangedTableRowsData(
  client: BambooHRClient,
  table: string,
  params?: Record<string, unknown>,
): Promise<ChangedTableRowsResponse> {
  return client.get<ChangedTableRowsResponse>(`/employees/changed/tables/${encodeURIComponent(table)}`, params);
}

export async function listTimeOffPoliciesData(client: BambooHRClient): Promise<TimeOffPoliciesResponse> {
  return client.get<TimeOffPoliciesResponse>('/meta/time_off/policies');
}

export async function getEmployeeTimeOffPoliciesData(
  client: BambooHRClient,
  employeeId: string,
): Promise<EmployeeTimeOffPoliciesResponse> {
  return client.get<EmployeeTimeOffPoliciesResponse>(buildV11Url(client, `/employees/${employeeId}/time_off/policies`));
}

export async function createTimeOffRequestData(
  client: BambooHRClient,
  employeeId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put(`/employees/${employeeId}/time_off/request`, payload);
}

export async function changeTimeOffRequestStatusData(
  client: BambooHRClient,
  requestId: string,
  status: 'approved' | 'denied' | 'declined' | 'canceled' | 'cancelled',
  payload?: Record<string, unknown>,
): Promise<unknown> {
  return client.put(`/time_off/requests/${requestId}/status`, {
    ...(payload ?? {}),
    status,
  });
}

export async function addTimeOffHistoryItemData(
  client: BambooHRClient,
  employeeId: string,
  payload: Record<string, unknown>,
): Promise<BambooHRResponse<unknown>> {
  return client.putDetailed(`/employees/${employeeId}/time_off/history`, payload);
}

export async function assignEmployeeTimeOffPoliciesData(
  client: BambooHRClient,
  employeeId: string,
  assignments: Array<Record<string, unknown>>,
): Promise<unknown> {
  return client.put(`/employees/${employeeId}/time_off/policies`, assignments);
}
