import { z } from 'zod';
import {
  addTimeOffHistoryItemData,
  assignEmployeeTimeOffPoliciesData,
  changeTimeOffRequestStatusData,
  createTimeOffRequestData,
  getEmployeeTimeOffPoliciesData,
  listTimeOffPoliciesData,
} from '../bambooData.js';
import { ensureMutationsEnabled } from '../mutations.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';
import { errorTextResult, jsonTextResult } from '../toolUtils.js';

const genericObjectSchema = z.record(z.string(), z.any());

export const listTimeOffPoliciesSchema = z.object({}).describe('List all BambooHR time-off policies available to the authenticated account');

export async function listTimeOffPolicies(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await listTimeOffPoliciesData(client);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error listing time off policies', error);
  }
}

export const getEmployeeTimeOffPoliciesSchema = z.object({
  employeeId: z.string().describe('The employee ID to fetch assigned time-off policies for'),
});

export async function getEmployeeTimeOffPolicies(
  params: z.infer<typeof getEmployeeTimeOffPoliciesSchema>,
  extra?: BambooRequestContext,
) {
  try {
    const client = getBambooClientForRequest(extra);
    const response = await getEmployeeTimeOffPoliciesData(client, params.employeeId);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error getting employee time off policies', error);
  }
}

export const createTimeOffRequestSchema = z.object({
  employeeId: z.string().describe('The employee ID to create the time-off request for'),
  payload: genericObjectSchema.describe('Raw BambooHR create-time-off-request payload to send to the API'),
  confirm: z.boolean().optional().describe('Must be true to execute this mutating action'),
});

export async function createTimeOffRequest(
  params: z.infer<typeof createTimeOffRequestSchema>,
  extra?: BambooRequestContext,
) {
  try {
    ensureMutationsEnabled(params.confirm);
    const client = getBambooClientForRequest(extra);
    const response = await createTimeOffRequestData(client, params.employeeId, params.payload);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error creating time off request', error);
  }
}

export const changeTimeOffRequestStatusSchema = z.object({
  requestId: z.string().describe('The BambooHR request ID to update'),
  action: z.enum(['approve', 'deny', 'cancel']).describe('The status transition to apply'),
  payload: genericObjectSchema.optional().describe('Optional additional BambooHR status-change payload fields'),
  confirm: z.boolean().optional().describe('Must be true to execute this mutating action'),
});

export async function changeTimeOffRequestStatus(
  params: z.infer<typeof changeTimeOffRequestStatusSchema>,
  extra?: BambooRequestContext,
) {
  try {
    ensureMutationsEnabled(params.confirm);
    const client = getBambooClientForRequest(extra);
    const response = await changeTimeOffRequestStatusData(client, params.requestId, params.action, params.payload);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error changing time off request status', error);
  }
}

export const addTimeOffHistoryItemSchema = z.object({
  employeeId: z.string().describe('The employee ID whose time-off history item will be created'),
  payload: genericObjectSchema.describe('Raw BambooHR time-off history payload to send to the API'),
  confirm: z.boolean().optional().describe('Must be true to execute this mutating action'),
});

export async function addTimeOffHistoryItem(
  params: z.infer<typeof addTimeOffHistoryItemSchema>,
  extra?: BambooRequestContext,
) {
  try {
    ensureMutationsEnabled(params.confirm);
    const client = getBambooClientForRequest(extra);
    const response = await addTimeOffHistoryItemData(client, params.employeeId, params.payload);

    return jsonTextResult({
      status: response.status,
      location: response.headers.location ?? null,
      data: response.data ?? null,
    });
  } catch (error) {
    return errorTextResult('Error adding time off history item', error);
  }
}

const timeOffPolicyAssignmentSchema = z.object({
  timeOffPolicyId: z.union([z.string(), z.number()]).describe('The BambooHR time-off policy ID to assign'),
  accrualStartDate: z.union([z.string(), z.null()]).describe('Start date for the policy assignment. Use null to unassign the policy.'),
}).passthrough();

export const assignEmployeeTimeOffPoliciesSchema = z.object({
  employeeId: z.string().describe('The employee ID whose time-off policy assignments will be updated'),
  assignments: z.array(timeOffPolicyAssignmentSchema).min(1).describe('Array of BambooHR time-off policy assignments. Use accrualStartDate=null to unassign a policy.'),
  confirm: z.boolean().optional().describe('Must be true to execute this mutating action'),
});

export async function assignEmployeeTimeOffPolicies(
  params: z.infer<typeof assignEmployeeTimeOffPoliciesSchema>,
  extra?: BambooRequestContext,
) {
  try {
    ensureMutationsEnabled(params.confirm);
    const client = getBambooClientForRequest(extra);
    const response = await assignEmployeeTimeOffPoliciesData(client, params.employeeId, params.assignments);
    return jsonTextResult(response);
  } catch (error) {
    return errorTextResult('Error assigning employee time off policies', error);
  }
}
