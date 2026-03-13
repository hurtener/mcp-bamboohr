import { z } from 'zod';
import type { Employee, EmployeeDirectory, Goals } from '../types.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';

/**
 * Get Employee Tool - Retrieves detailed employee information
 * 
 * Returns an Employee object with fields like:
 * - id, displayName, firstName, lastName, preferredName
 * - email, workEmail, jobTitle, department, division, location
 * - workPhone, supervisor, linkedIn, pronouns
 * - photoUploaded, photoUrl, canUploadPhoto
 * 
 * Any field from the employee directory can be requested via the 'fields' parameter.
 */
export const getEmployeeSchema = z.object({
  id: z.string().describe('Employee ID (use "0" for current user associated with API key)').default('0'),
  fields: z.string().describe('Comma-separated list of fields to retrieve. Available fields include: displayName, firstName, lastName, preferredName, email, workEmail, jobTitle, department, division, location, workPhone, supervisor, linkedIn, pronouns, photoUploaded, photoUrl, canUploadPhoto, and many more.').default('firstName,lastName,email,jobTitle'),
  onlyCurrent: z.boolean().describe('Set to false to return future dated values from history table fields').default(true).optional(),
});

export async function getEmployee(params: z.infer<typeof getEmployeeSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const queryParams: Record<string, any> = {
      fields: params.fields,
    };
    
    if (params.onlyCurrent !== undefined) {
      queryParams.onlyCurrent = params.onlyCurrent ? '1' : '0';
    }

    const response = await bambooClient.get<Employee>(`/employees/${params.id}`, queryParams);
    
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
        text: `Error getting employee: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

// Tool: Get Employee Photo
export const getEmployeePhotoSchema = z.object({
  employeeId: z.string().describe('The employee ID to get the photo for'),
  size: z.enum(['original', 'large', 'medium', 'small', 'xs', 'tiny']).describe('Photo size').default('medium'),
});

export async function getEmployeePhoto(params: z.infer<typeof getEmployeePhotoSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const photoBuffer = await bambooClient.getBuffer(`/employees/${params.employeeId}/photo/${params.size}`);
    
    // Convert buffer to base64 for returning in MCP response
    const base64Image = photoBuffer.toString('base64');
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          message: `Employee photo retrieved successfully (${photoBuffer.length} bytes)`,
          size: params.size,
          employeeId: params.employeeId,
          data: `data:image/jpeg;base64,${base64Image}`,
          bytes: photoBuffer.length
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error getting employee photo: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Employee Directory Tool - Retrieves the company-wide employee directory
 * 
 * Returns an array of Employee objects, each containing:
 * - id, displayName, firstName, lastName, preferredName
 * - jobTitle, department, division, location, supervisor
 * - workEmail, workPhone, linkedIn, pronouns
 * - photoUploaded, photoUrl, canUploadPhoto
 * 
 * This provides a comprehensive view of all employees in the organization.
 */
export const getEmployeeDirectorySchema = z.object({}).describe('Get the employee directory (no parameters required)');

export async function getEmployeeDirectory(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const response = await bambooClient.get<EmployeeDirectory>('/employees/directory');
    
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
        text: `Error getting employee directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Employee Goals Tool - Retrieves performance goals and objectives
 * 
 * Returns Goal objects with:
 * - id, title, description, percentComplete, status
 * - alignsWithOptionId, sharedWithEmployeeIds
 * - dueDate, completionDate, lastChangedDateTime
 * - milestones[] (array of milestone objects with progress tracking)
 * - actions (permissions like canEditGoalProgressBar)
 * 
 * Goals may be percentage-based or milestone-based for detailed progress tracking.
 */
export const getEmployeeGoalsSchema = z.object({
  employeeId: z.string().describe('The employee ID to get goals for'),
  filter: z.enum(['open', 'closed', 'all']).describe('Filter goals by status').default('all').optional(),
});

export async function getEmployeeGoals(params: z.infer<typeof getEmployeeGoalsSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const queryParams: Record<string, any> = {};
    
    if (params.filter && params.filter !== 'all') {
      queryParams.filter = params.filter;
    }

    const response = await bambooClient.get<Goals>(
      `/performance/employees/${params.employeeId}/goals`,
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
        text: `Error getting employee goals: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}
