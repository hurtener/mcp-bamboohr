import { z } from 'zod';
import type { CompanyFiles, Fields } from '../types.js';
import { getBambooClientForRequest, type BambooRequestContext } from '../requestContext.js';

/**
 * List Company Files Tool - Browse available company files and categories
 * 
 * Returns a CompanyFiles object with:
 * - categories: array of file categories, each containing:
 *   - id, name, displayName
 *   - files: array of CompanyFile objects with:
 *     - id, name, originalFileName, size, dateCreated
 *     - createdBy, categoryId, categoryName
 * 
 * Provides organized access to all company documents, policies, and resources.
 */
export const listCompanyFilesSchema = z.object({}).describe('List all company files and categories (no parameters required)');

export async function listCompanyFiles(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const response = await bambooClient.get<CompanyFiles>('/files/view');
    
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
        text: `Error listing company files: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Company File Tool - Download specific company documents
 * 
 * Returns file data with:
 * - message: Success confirmation with file size
 * - fileId: The requested file ID
 * - data: Base64 encoded file content
 * - bytes: File size in bytes
 * - note: Encoding information
 * 
 * Handles binary files (PDFs, images, etc.) by encoding as base64 for safe transport.
 */
export const getCompanyFileSchema = z.object({
  fileId: z.string().describe('The ID of the company file to retrieve'),
});

export async function getCompanyFile(params: z.infer<typeof getCompanyFileSchema>, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    // First try to get the file metadata
    try {
      const fileBuffer = await bambooClient.getBuffer(`/files/${params.fileId}`);
      
      // Convert to base64 for safe transport in JSON
      const base64Content = fileBuffer.toString('base64');
      
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            message: `Company file retrieved successfully (${fileBuffer.length} bytes)`,
            fileId: params.fileId,
            data: base64Content,
            bytes: fileBuffer.length,
            note: 'File content is base64 encoded'
          }, null, 2)
        }]
      };
    } catch (bufferError) {
      // If binary retrieval fails, try as JSON (might be metadata)
      const response = await bambooClient.get(`/files/${params.fileId}`);
      
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error getting company file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

/**
 * Get Meta Fields Tool - Discover available BambooHR data fields
 * 
 * Returns a Fields object with:
 * - fields: array of Field objects containing:
 *   - id: Field identifier (e.g., "firstName", "jobTitle")
 *   - type: Field type ("text", "email", "list", etc.)
 *   - name: Human-readable name
 *   - alias: Alternative identifier (optional)
 *   - deprecated: Whether field is deprecated (optional)
 * 
 * Essential for understanding what employee data fields can be requested.
 */
export const getMetaFieldsSchema = z.object({}).describe('Get a list of all available fields in the account (no parameters required)');

export async function getMetaFields(_: Record<string, never> = {}, extra?: BambooRequestContext) {
  try {
    const bambooClient = getBambooClientForRequest(extra);
    const response = await bambooClient.get<Fields>('/meta/fields');
    
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
        text: `Error getting meta fields: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}
