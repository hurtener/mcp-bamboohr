import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getEmployee,
  getEmployeeDirectory,
  getEmployeeDirectorySchema,
  getEmployeeGoals,
  getEmployeeGoalsSchema,
  getEmployeePhoto,
  getEmployeePhotoSchema,
  getEmployeeSchema,
} from './tools/employees.js';
import {
  estimateTimeOffBalance,
  estimateTimeOffBalanceSchema,
  getTimeOffRequests,
  getTimeOffRequestsSchema,
  getWhosOut,
  getWhosOutSchema,
} from './tools/timeOff.js';
import {
  getChangedEmployeeIds,
  getChangedEmployeeIdsSchema,
  getChangedTableRows,
  getChangedTableRowsSchema,
  getDatasetFieldOptions,
  getDatasetFieldOptionsSchema,
  getDatasetFields,
  getDatasetFieldsSchema,
  getEmployeeTable,
  getEmployeeTableSchema,
  getTabularFields,
  getTabularFieldsSchema,
  listDatasets,
  listDatasetsSchema,
  queryDataset,
  queryDatasetSchema,
} from './tools/datasets.js';
import {
  getCompanyFile,
  getCompanyFileSchema,
  getMetaFields,
  getMetaFieldsSchema,
  listCompanyFiles,
  listCompanyFilesSchema,
} from './tools/meta.js';
import {
  addTimeOffHistoryItem,
  addTimeOffHistoryItemSchema,
  assignEmployeeTimeOffPolicies,
  assignEmployeeTimeOffPoliciesSchema,
  changeTimeOffRequestStatus,
  changeTimeOffRequestStatusSchema,
  createTimeOffRequest,
  createTimeOffRequestSchema,
  getEmployeeTimeOffPolicies,
  getEmployeeTimeOffPoliciesSchema,
  listTimeOffPolicies,
  listTimeOffPoliciesSchema,
} from './tools/timeOffAdmin.js';
import {
  getDirectReports,
  getDirectReportsSchema,
  getEmployeeHistory,
  getEmployeeHistorySchema,
  getOrgSubtree,
  getOrgSubtreeSchema,
  searchPeople,
  searchPeopleSchema,
} from './tools/workflows.js';
import { registerSurfacePrompts, registerSurfaceResources } from './surface.js';

export function createBambooMcpServer(): McpServer {
  const server = new McpServer({
    name: 'bamboohr',
    version: '1.2.0',
  });

  server.registerTool('get-employee', {
    title: 'Get Employee',
    description: 'Get employee data with customizable field selection. Returns employee object with fields like displayName, firstName, lastName, jobTitle, department, division, location, supervisor, photoUrl, and many more based on the "fields" parameter.',
    inputSchema: getEmployeeSchema.shape,
    annotations: { title: 'Get Employee', readOnlyHint: true },
  }, getEmployee);

  server.registerTool('get-employee-photo', {
    title: 'Get Employee Photo',
    description: 'Get an employee photo by size',
    inputSchema: getEmployeePhotoSchema.shape,
    annotations: { title: 'Get Employee Photo', readOnlyHint: true },
  }, getEmployeePhoto);

  server.registerTool('get-employee-directory', {
    title: 'Get Employee Directory',
    description: 'Get the company-wide employee directory. Returns array of employee objects with comprehensive information including displayName, jobTitle, department, division, location, supervisor, workEmail, photoUrl, and more.',
    inputSchema: getEmployeeDirectorySchema.shape,
    annotations: { title: 'Get Employee Directory', readOnlyHint: true },
  }, getEmployeeDirectory);

  server.registerTool('get-employee-goals', {
    title: 'Get Employee Goals',
    description: 'Get performance goals and objectives for an employee. Returns goal objects with title, description, percentComplete, status, dueDate, milestones (for milestone-based goals), and progress tracking information.',
    inputSchema: getEmployeeGoalsSchema.shape,
    annotations: { title: 'Get Employee Goals', readOnlyHint: true },
  }, getEmployeeGoals);

  server.registerTool('estimate-time-off-balance', {
    title: 'Estimate Future Time Off Balance',
    description: 'Calculate future time off balances for an employee. Returns array of time off types with current balance, units (days/hours), policyType (accruing/discretionary/manual), and usedYearToDate amounts.',
    inputSchema: estimateTimeOffBalanceSchema.shape,
    annotations: { title: 'Estimate Future Time Off Balance', readOnlyHint: true },
  }, estimateTimeOffBalance);

  server.registerTool('get-time-off-requests', {
    title: 'Get Time Off Requests',
    description: 'Retrieve and filter time off requests. Returns request objects with id, employeeId, status, start/end dates, request type, amount, available actions (approve/deny/etc.), and employee/manager notes. Supports extensive filtering.',
    inputSchema: getTimeOffRequestsSchema.shape,
    annotations: { title: 'Get Time Off Requests', readOnlyHint: true },
  }, getTimeOffRequests);

  server.registerTool('get-whos-out', {
    title: "Get Who's Out",
    description: "View upcoming time off and holidays for a date range. Returns array of mixed events: timeOff events (id, type, employeeId, name, start, end) and holiday events (id, type, name, start, end) with summary counts.",
    inputSchema: getWhosOutSchema.shape,
    annotations: { title: "Get Who's Out", readOnlyHint: true },
  }, getWhosOut);

  server.registerTool('list-time-off-policies', {
    title: 'List Time Off Policies',
    description: 'List account-level BambooHR time-off policies.',
    inputSchema: listTimeOffPoliciesSchema.shape,
    annotations: { title: 'List Time Off Policies', readOnlyHint: true },
  }, listTimeOffPolicies);

  server.registerTool('get-employee-time-off-policies', {
    title: 'Get Employee Time Off Policies',
    description: 'Get assigned time-off policies for a specific employee using BambooHR v1.1 policy data.',
    inputSchema: getEmployeeTimeOffPoliciesSchema.shape,
    annotations: { title: 'Get Employee Time Off Policies', readOnlyHint: true },
  }, getEmployeeTimeOffPolicies);

  server.registerTool('create-time-off-request', {
    title: 'Create Time Off Request',
    description: 'Create a BambooHR time-off request. This mutates BambooHR data and requires confirm=true.',
    inputSchema: createTimeOffRequestSchema.shape,
    annotations: { title: 'Create Time Off Request', readOnlyHint: false },
  }, createTimeOffRequest);

  server.registerTool('change-time-off-request-status', {
    title: 'Change Time Off Request Status',
    description: 'Approve, deny, or cancel a BambooHR time-off request. This mutates BambooHR data and requires confirm=true.',
    inputSchema: changeTimeOffRequestStatusSchema.shape,
    annotations: { title: 'Change Time Off Request Status', readOnlyHint: false },
  }, changeTimeOffRequestStatus);

  server.registerTool('add-time-off-history-item', {
    title: 'Add Time Off History Item',
    description: 'Add a BambooHR time-off history item for an employee. This mutates BambooHR data and requires confirm=true.',
    inputSchema: addTimeOffHistoryItemSchema.shape,
    annotations: { title: 'Add Time Off History Item', readOnlyHint: false },
  }, addTimeOffHistoryItem);

  server.registerTool('assign-employee-time-off-policies', {
    title: 'Assign Employee Time Off Policies',
    description: 'Assign or unassign BambooHR time-off policies for an employee. This mutates BambooHR data and requires confirm=true.',
    inputSchema: assignEmployeeTimeOffPoliciesSchema.shape,
    annotations: { title: 'Assign Employee Time Off Policies', readOnlyHint: false },
  }, assignEmployeeTimeOffPolicies);

  server.registerTool('list-company-files', {
    title: 'List Company Files',
    description: 'Browse available company files and categories. Returns organized structure with file categories, each containing files with id, name, originalFileName, size, dateCreated, and category information.',
    inputSchema: listCompanyFilesSchema.shape,
    annotations: { title: 'List Company Files', readOnlyHint: true },
  }, listCompanyFiles);

  server.registerTool('get-company-file', {
    title: 'Get Company File',
    description: 'Download a specific company document by ID. Returns file data with base64-encoded content for binary files (PDFs, images, etc.) along with file size and metadata.',
    inputSchema: getCompanyFileSchema.shape,
    annotations: { title: 'Get Company File', readOnlyHint: true },
  }, getCompanyFile);

  server.registerTool('get-meta-fields', {
    title: 'Get Meta Fields',
    description: 'Discover all available BambooHR data fields. Returns array of field definitions with id, type (text/email/list/etc.), name, and optional alias. Essential for understanding what employee data fields can be requested.',
    inputSchema: getMetaFieldsSchema.shape,
    annotations: { title: 'Get Meta Fields', readOnlyHint: true },
  }, getMetaFields);

  server.registerTool('list-datasets', {
    title: 'List Datasets',
    description: 'List BambooHR datasets available to the current credential.',
    inputSchema: listDatasetsSchema.shape,
    annotations: { title: 'List Datasets', readOnlyHint: true },
  }, listDatasets);

  server.registerTool('get-dataset-fields', {
    title: 'Get Dataset Fields',
    description: 'List fields exposed by a BambooHR dataset.',
    inputSchema: getDatasetFieldsSchema.shape,
    annotations: { title: 'Get Dataset Fields', readOnlyHint: true },
  }, getDatasetFields);

  server.registerTool('get-dataset-field-options', {
    title: 'Get Dataset Field Options',
    description: 'Retrieve possible filter values for BambooHR dataset fields.',
    inputSchema: getDatasetFieldOptionsSchema.shape,
    annotations: { title: 'Get Dataset Field Options', readOnlyHint: true },
  }, getDatasetFieldOptions);

  server.registerTool('query-dataset', {
    title: 'Query Dataset',
    description: 'Run a structured BambooHR dataset query with fields, filters, sorting, grouping, and aggregations.',
    inputSchema: queryDatasetSchema.shape,
    annotations: { title: 'Query Dataset', readOnlyHint: true },
  }, queryDataset);

  server.registerTool('get-tabular-fields', {
    title: 'Get Tabular Fields',
    description: 'List BambooHR tabular field metadata and common employee-history tables.',
    inputSchema: getTabularFieldsSchema.shape,
    annotations: { title: 'Get Tabular Fields', readOnlyHint: true },
  }, getTabularFields);

  server.registerTool('get-employee-table', {
    title: 'Get Employee Table',
    description: 'Fetch rows from a BambooHR employee table such as jobInfo or compensation.',
    inputSchema: getEmployeeTableSchema.shape,
    annotations: { title: 'Get Employee Table', readOnlyHint: true },
  }, getEmployeeTable);

  server.registerTool('get-changed-employee-ids', {
    title: 'Get Changed Employee IDs',
    description: 'List employees changed since a point in time.',
    inputSchema: getChangedEmployeeIdsSchema.shape,
    annotations: { title: 'Get Changed Employee IDs', readOnlyHint: true },
  }, getChangedEmployeeIds);

  server.registerTool('get-changed-table-rows', {
    title: 'Get Changed Table Rows',
    description: 'List changed BambooHR table rows since a point in time.',
    inputSchema: getChangedTableRowsSchema.shape,
    annotations: { title: 'Get Changed Table Rows', readOnlyHint: true },
  }, getChangedTableRows);

  server.registerTool('search-people', {
    title: 'Search People',
    description: 'Search BambooHR people data via the employee directory and return compact employee cards. Falls back to datasets only when directory access is unavailable.',
    inputSchema: searchPeopleSchema.shape,
    annotations: { title: 'Search People', readOnlyHint: true },
  }, searchPeople);

  server.registerTool('get-employee-history', {
    title: 'Get Employee History',
    description: 'Aggregate common employee history tables such as jobInfo, compensation, and employmentStatus.',
    inputSchema: getEmployeeHistorySchema.shape,
    annotations: { title: 'Get Employee History', readOnlyHint: true },
  }, getEmployeeHistory);

  server.registerTool('get-direct-reports', {
    title: 'Get Direct Reports',
    description: 'List direct reports for an employee. Reads the BambooHR employee directory once (with dataset fallback) and returns compact employee cards including managerId for further org-chart traversal.',
    inputSchema: getDirectReportsSchema.shape,
    annotations: { title: 'Get Direct Reports', readOnlyHint: true },
  }, getDirectReports);

  server.registerTool('get-org-subtree', {
    title: 'Get Org Subtree',
    description: 'Walk the org chart downward from an employee, returning a nested tree of direct reports up to maxDepth. Uses one directory fetch (with dataset fallback) and traverses in memory; respects maxNodes to bound output size.',
    inputSchema: getOrgSubtreeSchema.shape,
    annotations: { title: 'Get Org Subtree', readOnlyHint: true },
  }, getOrgSubtree);

  registerSurfaceResources(server);
  registerSurfacePrompts(server);

  return server;
}
