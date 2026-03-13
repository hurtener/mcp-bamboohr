const mockGet = jest.fn();
const mockGetBuffer = jest.fn();

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: jest.fn(() => ({
    get: mockGet,
    getBuffer: mockGetBuffer,
  })),
}));

import { getEmployee, getEmployeePhoto, getEmployeeDirectory, getEmployeeGoals } from '../../tools/employees';

describe('Employee Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployee', () => {
    it('should return employee data with default parameters', async () => {
      const mockEmployee = {
        id: '123',
        displayName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        preferredName: null,
        email: 'john.doe@company.com',
        workEmail: 'john.doe@company.com',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        division: 'Technology',
        location: 'New York',
        supervisor: 'Jane Smith',
        photoUploaded: true,
        photoUrl: 'https://images.bamboohr.com/123/photos/123-0-4.jpg',
        canUploadPhoto: 1
      };

      mockGet.mockResolvedValue(mockEmployee);

      const result = await getEmployee({
        id: '123',
        fields: 'firstName,lastName,email,jobTitle'
      });

      expect(mockGet).toHaveBeenCalledWith('/employees/123', {
        fields: 'firstName,lastName,email,jobTitle'
      });

      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockEmployee);
      expect(result.isError).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Employee not found');
      mockGet.mockRejectedValue(error);

      const result = await getEmployee({
        id: '999',
        fields: 'firstName,lastName'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee: Employee not found');
    });

    it('should handle non-Error exceptions in getEmployee', async () => {
      mockGet.mockRejectedValue('API is down');

      const result = await getEmployee({
        id: '999',
        fields: 'firstName,lastName'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee: Unknown error');
    });

    it('should include onlyCurrent parameter when specified', async () => {
      mockGet.mockResolvedValue({ id: '123' });

      await getEmployee({
        id: '123',
        fields: 'firstName',
        onlyCurrent: false
      });

      expect(mockGet).toHaveBeenCalledWith('/employees/123', {
        fields: 'firstName',
        onlyCurrent: '0'
      });
    });

    it('should handle onlyCurrent = true correctly', async () => {
      mockGet.mockResolvedValue({ id: '123' });

      await getEmployee({
        id: '123',
        fields: 'firstName',
        onlyCurrent: true
      });

      expect(mockGet).toHaveBeenCalledWith('/employees/123', {
        fields: 'firstName',
        onlyCurrent: '1'
      });
    });
  });

  describe('getEmployeePhoto', () => {
    it('should return employee photo as base64', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      mockGetBuffer.mockResolvedValue(mockBuffer);

      const result = await getEmployeePhoto({
        employeeId: '123',
        size: 'medium'
      });

      expect(mockGetBuffer).toHaveBeenCalledWith('/employees/123/photo/medium');
      expect(result.content[0].type).toBe('text');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.employeeId).toBe('123');
      expect(responseData.size).toBe('medium');
      expect(responseData.data).toContain('data:image/jpeg;base64,');
    });

    it('should handle photo retrieval errors', async () => {
      mockGetBuffer.mockRejectedValue(new Error('Photo not found'));

      const result = await getEmployeePhoto({
        employeeId: '999',
        size: 'large'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee photo: Photo not found');
    });

    it('should handle non-Error exceptions in photo retrieval', async () => {
      mockGetBuffer.mockRejectedValue('Photo server offline');

      const result = await getEmployeePhoto({
        employeeId: '999',
        size: 'large'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee photo: Unknown error');
    });
  });

  describe('getEmployeeDirectory', () => {
    it('should return employee directory', async () => {
      const mockDirectory = {
        employees: [
          {
            id: '1',
            displayName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            preferredName: null,
            jobTitle: 'Software Engineer',
            workPhone: null,
            workEmail: 'john.doe@company.com',
            department: 'Engineering',
            location: 'New York',
            division: 'Technology',
            linkedIn: null,
            pronouns: null,
            supervisor: 'Jane Smith',
            photoUploaded: true,
            photoUrl: 'https://images.bamboohr.com/580638/photos/1-0-4.jpg',
            canUploadPhoto: 1
          },
          {
            id: '2',
            displayName: 'Jane Smith',
            firstName: 'Jane',
            lastName: 'Smith',
            preferredName: null,
            jobTitle: 'Engineering Manager',
            workPhone: '+1-555-0123',
            workEmail: 'jane.smith@company.com',
            department: 'Engineering',
            location: 'San Francisco',
            division: 'Technology',
            linkedIn: 'https://linkedin.com/in/janesmith',
            pronouns: 'she/her',
            supervisor: 'Bob Johnson',
            photoUploaded: false,
            photoUrl: null,
            canUploadPhoto: 1
          }
        ]
      };

      mockGet.mockResolvedValue(mockDirectory);

      const result = await getEmployeeDirectory();

      expect(mockGet).toHaveBeenCalledWith('/employees/directory');
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockDirectory);
    });

    it('should handle directory access errors', async () => {
      mockGet.mockRejectedValue(new Error('Directory access denied'));

      const result = await getEmployeeDirectory();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee directory: Directory access denied');
    });

    it('should handle non-Error exceptions in directory', async () => {
      mockGet.mockRejectedValue('String error');

      const result = await getEmployeeDirectory();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee directory: Unknown error');
    });
  });

  describe('getEmployeeGoals', () => {
    it('should return employee goals with filter', async () => {
      const mockGoals = {
        goals: [
          {
            id: '100',
            title: 'Complete quarterly training modules',
            description: 'Complete the required training modules for this quarter including security awareness and compliance training.',
            percentComplete: 0,
            alignsWithOptionId: null,
            sharedWithEmployeeIds: [123],
            dueDate: '2025-12-31',
            completionDate: null,
            lastChangedDateTime: '2025-03-17T14:47:48Z',
            status: 'in_progress',
            milestones: [
              {
                id: 1,
                employeeGoalId: 100,
                title: 'Security Training',
                currentValue: null,
                startValue: null,
                endValue: null,
                completedDateTime: null,
                lastUpdateDateTime: '2025-03-17T14:47:48Z',
                lastUpdateUserId: 100
              },
              {
                id: 2,
                employeeGoalId: 100,
                title: 'Compliance Training',
                currentValue: null,
                startValue: null,
                endValue: null,
                completedDateTime: null,
                lastUpdateDateTime: '2025-03-17T14:47:48Z',
                lastUpdateUserId: 100
              }
            ],
            actions: {
              canEditGoalProgressBar: false,
              canEditGoalMilestoneProgressBar: true
            }
          },
          {
            id: '200',
            title: 'Improve customer satisfaction scores',
            description: 'Work on initiatives to improve customer satisfaction ratings and reduce response times.',
            percentComplete: 80,
            alignsWithOptionId: null,
            sharedWithEmployeeIds: [123],
            dueDate: '2025-12-31',
            completionDate: null,
            lastChangedDateTime: '2025-04-24T09:56:39Z',
            status: 'in_progress'
          }
        ]
      };

      mockGet.mockResolvedValue(mockGoals);

      const result = await getEmployeeGoals({
        employeeId: '123',
        filter: 'open'
      });

      expect(mockGet).toHaveBeenCalledWith('/performance/employees/123/goals', {
        filter: 'open'
      });
      expect(JSON.parse(result.content[0].text)).toEqual(mockGoals);
    });

    it('should handle goals retrieval without filter', async () => {
      const mockGoals = { goals: [] };
      mockGet.mockResolvedValue(mockGoals);

      await getEmployeeGoals({
        employeeId: '123',
        filter: 'all'
      });

      expect(mockGet).toHaveBeenCalledWith('/performance/employees/123/goals', {});
    });

    it('should handle goals API errors', async () => {
      mockGet.mockRejectedValue(new Error('Goals access denied'));

      const result = await getEmployeeGoals({
        employeeId: '123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee goals: Goals access denied');
    });

    it('should handle non-Error exceptions in goals', async () => {
      mockGet.mockRejectedValue({ code: 'NETWORK_ERROR', status: 500 });

      const result = await getEmployeeGoals({
        employeeId: '123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting employee goals: Unknown error');
    });
  });
});
