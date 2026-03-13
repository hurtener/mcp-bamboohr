const mockGet = jest.fn();
const mockGetBuffer = jest.fn();

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: jest.fn(() => ({
    get: mockGet,
    getBuffer: mockGetBuffer,
  })),
}));

import { listCompanyFiles, getCompanyFile, getMetaFields } from '../../tools/meta';

describe('Meta Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listCompanyFiles', () => {
    it('should list company files and categories', async () => {
      const mockFiles = {
        categories: [
          {
            id: '1',
            name: 'HR Policies',
            canUploadFiles: 'no',
            files: [
              {
                id: '100',
                name: 'Employee Handbook.doc',
                originalFileName: 'Employee Handbook.doc',
                size: 329728,
                dateCreated: '2024-01-15 10:30:00',
                createdBy: 'HR Manager',
                shareWithEmployees: 'yes',
                canRenameFile: 'no',
                canDeleteFile: 'no'
              }
            ]
          },
          {
            id: '2',
            name: 'Benefits Documentation',
            canUploadFiles: 'no',
            files: [
              {
                id: '200',
                name: 'Benefits Guide.pdf',
                originalFileName: 'Benefits Guide.pdf',
                size: 652687,
                dateCreated: '2024-02-01 09:00:00',
                createdBy: 'Benefits Admin',
                shareWithEmployees: 'yes',
                canRenameFile: 'no',
                canDeleteFile: 'no'
              }
            ]
          }
        ]
      };

      mockGet.mockResolvedValue(mockFiles);

      const result = await listCompanyFiles();

      expect(mockGet).toHaveBeenCalledWith('/files/view');
      expect(JSON.parse(result.content[0].text)).toEqual(mockFiles);
    });

    it('should handle file listing errors', async () => {
      mockGet.mockRejectedValue(new Error('Files access denied'));

      const result = await listCompanyFiles();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing company files: Files access denied');
    });

    it('should handle non-Error exceptions in file listing', async () => {
      mockGet.mockRejectedValue('Network timeout');

      const result = await listCompanyFiles();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing company files: Unknown error');
    });
  });

  describe('getCompanyFile', () => {
    it('should get company file as binary data', async () => {
      const mockBuffer = Buffer.from('fake-file-content');
      mockGetBuffer.mockResolvedValue(mockBuffer);

      const result = await getCompanyFile({ fileId: '101' });

      expect(mockGetBuffer).toHaveBeenCalledWith('/files/101');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.fileId).toBe('101');
      expect(responseData.bytes).toBe(mockBuffer.length);
      expect(responseData.data).toBe(mockBuffer.toString('base64'));
    });

    it('should fallback to JSON when binary fails', async () => {
      const mockFileData = { id: '101', name: 'test.pdf', metadata: 'some data' };
      mockGetBuffer.mockRejectedValue(new Error('Not binary'));
      mockGet.mockResolvedValue(mockFileData);

      const result = await getCompanyFile({ fileId: '101' });

      expect(mockGetBuffer).toHaveBeenCalledWith('/files/101');
      expect(mockGet).toHaveBeenCalledWith('/files/101');
      expect(JSON.parse(result.content[0].text)).toEqual(mockFileData);
    });

    it('should handle complete file retrieval failure', async () => {
      mockGetBuffer.mockRejectedValue(new Error('File not found'));
      mockGet.mockRejectedValue(new Error('File not found'));

      const result = await getCompanyFile({ fileId: '999' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting company file: File not found');
    });

    it('should handle non-Error exceptions in file retrieval', async () => {
      mockGetBuffer.mockRejectedValue('Network failure');
      mockGet.mockRejectedValue('Network failure');

      const result = await getCompanyFile({ fileId: '999' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting company file: Unknown error');
    });
  });

  describe('getMetaFields', () => {
    it('should get all available fields', async () => {
      const mockFields = {
        fields: [
          { id: 8, name: 'Address Line 1', type: 'text', alias: 'address1' },
          { id: 9, name: 'Address Line 2', type: 'text', alias: 'address2' },
          { id: 4491, name: 'Annual Amount', type: 'currency', alias: 'amount' },
          { id: '4491.1', name: 'Annual Amount - Currency code', type: 'text', alias: 'amount' },
          { id: 4492, name: 'Annual Percentage', type: 'percentage', alias: 'percentage' },
          { id: 4436, name: 'Assets: Category', type: 'list' }
        ]
      };

      mockGet.mockResolvedValue(mockFields);

      const result = await getMetaFields();

      expect(mockGet).toHaveBeenCalledWith('/meta/fields');
      expect(JSON.parse(result.content[0].text)).toEqual(mockFields);
    });

    it('should handle fields retrieval errors', async () => {
      mockGet.mockRejectedValue(new Error('Fields access denied'));

      const result = await getMetaFields();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting meta fields: Fields access denied');
    });

    it('should handle non-Error exceptions in fields retrieval', async () => {
      mockGet.mockRejectedValue(404);

      const result = await getMetaFields();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting meta fields: Unknown error');
    });
  });

});
