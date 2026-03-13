const mockGet = jest.fn();

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: jest.fn(() => ({
    get: mockGet,
  })),
}));

import { estimateTimeOffBalance, getTimeOffRequests, getWhosOut } from '../../tools/timeOff';

describe('Time Off Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('estimateTimeOffBalance', () => {
    it('should estimate time off balance with date parameter', async () => {
      const mockBalance = [
        {
          timeOffType: '83',
          name: 'Vacation',
          units: 'days',
          balance: '10.00',
          end: '2025-09-03',
          policyType: 'accruing',
          usedYearToDate: '10.00'
        },
        {
          timeOffType: '96',
          name: 'Sick Leave',
          units: 'days',
          balance: '0.00',
          end: '2025-09-03',
          policyType: 'discretionary',
          usedYearToDate: '0.00'
        }
      ];

      mockGet.mockResolvedValue(mockBalance);

      const result = await estimateTimeOffBalance({
        employeeId: '123',
        date: '2024-12-31'
      });

      expect(mockGet).toHaveBeenCalledWith('/employees/123/time_off/calculator', {
        date: '2024-12-31'
      });
      expect(JSON.parse(result.content[0].text)).toEqual(mockBalance);
    });

    it('should work without date parameter', async () => {
      mockGet.mockResolvedValue([]);

      await estimateTimeOffBalance({
        employeeId: '123'
      });

      expect(mockGet).toHaveBeenCalledWith('/employees/123/time_off/calculator', {});
    });

    it('should handle balance estimation errors', async () => {
      mockGet.mockRejectedValue(new Error('Access denied'));

      const result = await estimateTimeOffBalance({
        employeeId: '123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error estimating time off balance: Access denied');
    });

    it('should handle non-Error exceptions in balance estimation', async () => {
      mockGet.mockRejectedValue({ status: 503, message: 'Service unavailable' });

      const result = await estimateTimeOffBalance({
        employeeId: '123'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error estimating time off balance: Unknown error');
    });
  });

  describe('getTimeOffRequests', () => {
    it('should get time off requests with all filters', async () => {
      const mockRequests = {
        requests: [
          {
            id: '2805',
            employeeId: '123',
            name: 'John Doe',
            status: {
              lastChanged: '2024-08-12',
              lastChangedByUserId: '2595',
              status: 'approved'
            },
            start: '2024-09-24',
            end: '2024-09-24',
            created: '2024-08-05',
            type: {
              id: '83',
              name: 'Vacation',
              icon: 'palm-trees'
            },
            amount: {
              unit: 'days',
              amount: '1'
            },
            actions: {
              view: true,
              edit: false,
              cancel: false,
              approve: false,
              deny: false,
              bypass: false
            },
            dates: {
              '2024-09-24': '1'
            },
            notes: {
              employee: 'Personal day off'
            }
          }
        ]
      };

      mockGet.mockResolvedValue(mockRequests);

      const result = await getTimeOffRequests({
        id: 1,
        action: 'approve',
        employeeId: '123',
        start: '2024-01-01',
        end: '2024-12-31',
        status: 'approved',
        type: '1'
      });

      expect(mockGet).toHaveBeenCalledWith('/time_off/requests', {
        id: 1,
        action: 'approve',
        employeeId: '123',
        start: '2024-01-01',
        end: '2024-12-31',
        status: 'approved',
        type: '1'
      });
      expect(JSON.parse(result.content[0].text)).toEqual(mockRequests);
    });

    it('should work with minimal parameters', async () => {
      mockGet.mockResolvedValue({ requests: [] });

      await getTimeOffRequests({});

      expect(mockGet).toHaveBeenCalledWith('/time_off/requests', {});
    });

    it('should handle request retrieval errors', async () => {
      mockGet.mockRejectedValue(new Error('Requests not accessible'));

      const result = await getTimeOffRequests({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting time off requests: Requests not accessible');
    });

    it('should handle non-Error exceptions in request retrieval', async () => {
      mockGet.mockRejectedValue(403);

      const result = await getTimeOffRequests({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting time off requests: Unknown error');
    });
  });

  describe('getWhosOut', () => {
    it('should get who\'s out with date range', async () => {
      const mockWhosOut = [
        {
          id: 5692,
          type: 'timeOff',
          employeeId: 123,
          name: 'John Doe',
          start: '2025-08-25',
          end: '2025-09-04'
        },
        {
          id: 143,
          type: 'holiday',
          name: 'Independence Day',
          start: '2025-09-06',
          end: '2025-09-06'
        },
        {
          id: 164,
          type: 'holiday',
          name: 'Labor Day',
          start: '2025-09-08',
          end: '2025-09-08'
        }
      ];

      mockGet.mockResolvedValue(mockWhosOut);

      const result = await getWhosOut({
        start: '2025-08-01',
        end: '2025-09-30'
      });

      expect(mockGet).toHaveBeenCalledWith('/time_off/whos_out', {
        start: '2025-08-01',
        end: '2025-09-30'
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary.totalEvents).toBe(3);
      expect(responseData.summary.timeOffCount).toBe(1);
      expect(responseData.summary.holidayCount).toBe(2);
      expect(responseData.events).toEqual(mockWhosOut);
    });

    it('should work without date parameters', async () => {
      mockGet.mockResolvedValue([]);

      const result = await getWhosOut({});

      expect(mockGet).toHaveBeenCalledWith('/time_off/whos_out', {});
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary.totalEvents).toBe(0);
      expect(responseData.summary.timeOffCount).toBe(0);
      expect(responseData.summary.holidayCount).toBe(0);
    });

    it('should handle who\'s out retrieval errors', async () => {
      mockGet.mockRejectedValue(new Error('Calendar access denied'));

      const result = await getWhosOut({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting who\'s out: Calendar access denied');
    });

    it('should handle non-Error exceptions in whos out retrieval', async () => {
      mockGet.mockRejectedValue('Calendar service down');

      const result = await getWhosOut({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting who\'s out: Unknown error');
    });

    it('should handle empty data gracefully', async () => {
      // Test when API returns empty array
      mockGet.mockResolvedValue([]);

      const result = await getWhosOut({});

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary.totalEvents).toBe(0);
      expect(responseData.summary.timeOffCount).toBe(0);
      expect(responseData.summary.holidayCount).toBe(0);
      expect(responseData.events).toEqual([]);
    });
  });
});
