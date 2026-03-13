import { z } from 'zod';
import {
  getChangedEmployeeIdsData,
  getChangedTableRowsData,
  getDatasetFieldOptionsData,
  getDatasetFieldsData,
  getEmployeeTableData,
  getTabularFieldsData,
  listDatasetsData,
  queryDatasetData,
} from '../bambooData.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';
import { errorTextResult, jsonTextResult } from '../toolUtils.js';

const genericObjectSchema = z.record(z.string(), z.any());

export const listDatasetsSchema = z.object({}).describe('List BambooHR datasets that can be queried');

export async function listDatasets(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await listDatasetsData(client);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error listing datasets', error);
  }
}

export const getDatasetFieldsSchema = z.object({
  datasetName: z.string().describe('The BambooHR dataset name, such as "employees" or "timeOff"'),
});

export async function getDatasetFields(params: z.infer<typeof getDatasetFieldsSchema>, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getDatasetFieldsData(client, params.datasetName);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting dataset fields', error);
  }
}

export const getDatasetFieldOptionsSchema = z.object({
  datasetName: z.string().describe('The BambooHR dataset name'),
  fields: z.array(z.string()).optional().describe('Field names to fetch option values for'),
  filters: genericObjectSchema.optional().describe('Optional current dataset filters used to constrain the option results'),
  request: genericObjectSchema.optional().describe('Optional raw BambooHR field-options request body to send as-is'),
});

export async function getDatasetFieldOptions(
  params: z.infer<typeof getDatasetFieldOptionsSchema>,
  extra?: BambooRequestContext,
) {
  try {
    const client = getBambooClientForRequest(extra);
    const payload = params.request ?? {
      ...(params.fields ? { fields: params.fields } : {}),
      ...(params.filters ? { filters: params.filters } : {}),
    };
    const response = await getDatasetFieldOptionsData(client, params.datasetName, payload);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting dataset field options', error);
  }
}

export const queryDatasetSchema = z.object({
  datasetName: z.string().describe('The BambooHR dataset name'),
  query: z.object({
    fields: z.array(z.string()).optional(),
    filters: genericObjectSchema.optional(),
    sortBy: z.array(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    aggregations: genericObjectSchema.optional(),
    showHistory: z.boolean().optional(),
  }).passthrough().describe('Structured BambooHR dataset query payload'),
});

export async function queryDataset(params: z.infer<typeof queryDatasetSchema>, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await queryDatasetData(client, params.datasetName, params.query);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error querying dataset', error);
  }
}

export const getTabularFieldsSchema = z.object({}).describe('List BambooHR tabular field metadata');

export async function getTabularFields(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getTabularFieldsData(client);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting tabular fields', error);
  }
}

export const getEmployeeTableSchema = z.object({
  employeeId: z.string().describe('The employee ID to fetch table data for'),
  table: z.string().describe('The BambooHR employee table name, such as "jobInfo" or "compensation"'),
});

export async function getEmployeeTable(params: z.infer<typeof getEmployeeTableSchema>, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getEmployeeTableData(client, params.employeeId, params.table);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting employee table', error);
  }
}

export const getChangedEmployeeIdsSchema = z.object({
  since: z.string().optional().describe('Timestamp or date accepted by BambooHR, typically an ISO timestamp'),
  params: genericObjectSchema.optional().describe('Optional raw query parameters to merge into the changed-employees request'),
});

export async function getChangedEmployeeIds(
  params: z.infer<typeof getChangedEmployeeIdsSchema>,
  extra?: BambooRequestContext,
) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getChangedEmployeeIdsData(client, {
      ...(params.since ? { since: params.since } : {}),
      ...(params.params ?? {}),
    });
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting changed employee IDs', error);
  }
}

export const getChangedTableRowsSchema = z.object({
  table: z.string().describe('The BambooHR table name to inspect for changes'),
  since: z.string().optional().describe('Timestamp or date accepted by BambooHR, typically an ISO timestamp'),
  params: genericObjectSchema.optional().describe('Optional raw query parameters to merge into the changed-table request'),
});

export async function getChangedTableRows(
  params: z.infer<typeof getChangedTableRowsSchema>,
  extra?: BambooRequestContext,
) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getChangedTableRowsData(client, params.table, {
      ...(params.since ? { since: params.since } : {}),
      ...(params.params ?? {}),
    });
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting changed table rows', error);
  }
}
