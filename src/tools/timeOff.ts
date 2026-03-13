import { z } from 'zod';
import type { TimeOffBalances, TimeOffRequests, WhosOut } from '../types.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';

/**
 * Estimate Future Time Off Balance Tool - Calculate future time off balances
 * 
 * Returns an array of TimeOffBalance objects, each containing:
 * - timeOffType: ID of the time off type
 * - name: Display name (e.g., "Vacation", "Sick Leave", "Unpaid Leave")
 * - units: "days" or "hours"
 * - balance: Current balance as string (e.g., "10.00")
 * - end: Date string (YYYY-MM-DD)
 * - policyType: "accruing", "discretionary", or "manual"
 * - usedYearToDate: Used amount this year as string
 */
export const estimateTimeOffBalanceSchema = z.object({
  employeeId: z.string().describe('The employee ID to estimate time off balance for'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Future date to estimate balance for (YYYY-MM-DD format)').optional(),
});

export async function estimateTimeOffBalance(params: z.infer<typeof estimateTimeOffBalanceSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const queryParams: Record<string, any> = {};
    
    if (params.date) {
      queryParams.date = params.date;
    }

    const response = await bambooClient.get<TimeOffBalances>(
      `/employees/${params.employeeId}/time_off/calculator`,
      queryParams
    );
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error estimating time off balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Time Off Requests Tool - Retrieve and filter time off requests
 * 
 * Returns TimeOffRequest objects with:
 * - id, employeeId, name
 * - status: { lastChanged, lastChangedByUserId, status }
 * - start, end, created (date strings YYYY-MM-DD)
 * - type: { id, name, icon }
 * - amount: { unit, amount } (amounts as strings)
 * - actions: { view, edit, cancel, approve, deny, bypass }
 * - dates: object with date-specific amounts as strings
 * - notes: { employee?, manager? }
 * 
 * Supports extensive filtering by status, employee, date range, and type.
 */
export const getTimeOffRequestsSchema = z.object({
  id: z.number().describe('Specific request ID to limit the response to').optional(),
  action: z.enum(['view', 'approve']).describe('Limit to requests that the user has a particular level of access to').default('view').optional(),
  employeeId: z.string().describe('Specific employee ID to filter requests for').optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date filter (YYYY-MM-DD format)').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date filter (YYYY-MM-DD format)').optional(),
  status: z.enum(['approved', 'denied', 'superceded', 'requested', 'canceled']).describe('Filter by request status').optional(),
  type: z.string().describe('Filter by time off type ID').optional(),
});

export async function getTimeOffRequests(params: z.infer<typeof getTimeOffRequestsSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const queryParams: Record<string, any> = {};
    
    if (params.id !== undefined) queryParams.id = params.id;
    if (params.action) queryParams.action = params.action;
    if (params.employeeId) queryParams.employeeId = params.employeeId;
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.type = params.type;

    const response = await bambooClient.get<TimeOffRequests>('/time_off/requests', queryParams);
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error getting time off requests: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Who's Out Tool - View upcoming time off and holidays
 * 
 * Returns an array of mixed timeOff and holiday events:
 * - timeOff events: { id, type: "timeOff", employeeId, name, start, end }
 * - holiday events: { id, type: "holiday", name, start, end }
 * 
 * Provides a comprehensive calendar view of upcoming absences and company holidays.
 */
export const getWhosOutSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD format) - defaults to current date').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD format) - defaults to 14 days from start date').optional(),
});

export async function getWhosOut(params: z.infer<typeof getWhosOutSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const queryParams: Record<string, any> = {};
    
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;

    const response = await bambooClient.get<WhosOut>('/time_off/whos_out', queryParams);
    
    // Add summary information to help users understand the data
    const timeOffEvents = response.filter(event => event.type === 'timeOff');
    const holidayEvents = response.filter(event => event.type === 'holiday');
    
    const formattedResponse = {
      summary: {
        totalEvents: response.length,
        timeOffCount: timeOffEvents.length,
        holidayCount: holidayEvents.length,
        dateRange: {
          start: params.start || 'current date',
          end: params.end || '14 days from start'
        }
      },
      events: response
    };
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formattedResponse, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error getting who's out: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}
