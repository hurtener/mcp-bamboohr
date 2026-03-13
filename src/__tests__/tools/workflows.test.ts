const mockQueryDatasetData = jest.fn();
const mockGetEmployeeTableData = jest.fn();
const mockListDatasetsData = jest.fn();
const mockGetBambooClientForRequest = jest.fn(() => ({}));

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: mockGetBambooClientForRequest,
}));

jest.mock('../../bambooData', () => ({
  COMMON_HISTORY_TABLES: ['jobInfo', 'compensation', 'employmentStatus'],
  extractDatasetRows: (response: any) => response.data ?? [],
  listDatasetsData: mockListDatasetsData,
  resolveEmployeeDatasetName: jest.requireActual('../../bambooData').resolveEmployeeDatasetName,
  queryDatasetData: mockQueryDatasetData,
  getEmployeeTableData: mockGetEmployeeTableData,
}));

import { getEmployeeHistory, searchPeople } from '../../tools/workflows';

describe('Workflow Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search people and return compact employee cards', async () => {
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'employee' }] });
    mockQueryDatasetData.mockResolvedValue({
      data: [
        {
          id: '1',
          displayName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          workEmail: 'jane@example.com',
          department: 'Engineering',
          location: 'Remote',
          supervisor: 'Alex Manager',
          status: 'Active',
        },
      ],
    });

    const result = await searchPeople({ query: 'jane', department: 'engineering', limit: 5 });
    const payload = JSON.parse(result.content[0].text);

    expect(mockQueryDatasetData).toHaveBeenCalledWith({}, 'employee', expect.any(Object));
    expect(payload.count).toBe(1);
    expect(payload.employees[0]).toEqual({
      id: '1',
      displayName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      workEmail: 'jane@example.com',
      jobTitle: null,
      department: 'Engineering',
      location: 'Remote',
      manager: 'Alex Manager',
      status: 'Active',
    });
  });

  it('should aggregate employee history tables and preserve per-table errors', async () => {
    mockGetEmployeeTableData.mockImplementation(async (_client: any, _employeeId: string, table: string) => {
      if (table === 'compensation') {
        throw new Error('Forbidden');
      }

      return [{ table }];
    });

    const result = await getEmployeeHistory({ employeeId: '123', tables: ['jobInfo', 'compensation'] });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.history.jobInfo).toEqual([{ table: 'jobInfo' }]);
    expect(payload.errors.compensation).toBe('Forbidden');
  });

  it('should fail clearly when no employee dataset is discoverable', async () => {
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'timeOff' }] });

    const result = await searchPeople({ query: 'jane' });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain('Could not determine the BambooHR employee dataset');
  });
});
