const mockClientGet = jest.fn();
const mockQueryDatasetData = jest.fn();
const mockGetEmployeeTableData = jest.fn();
const mockListDatasetsData = jest.fn();
const mockGetBambooClientForRequest = jest.fn(() => ({
  get: mockClientGet,
}));

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

  it('should search people via the employee directory first and return compact employee cards', async () => {
    mockClientGet.mockResolvedValue({
      employees: [
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

    expect(mockClientGet).toHaveBeenCalledWith('/employees/directory');
    expect(mockListDatasetsData).not.toHaveBeenCalled();
    expect(payload.source).toBe('directory');
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

  it('should fall back to dataset search when directory access is unavailable', async () => {
    mockClientGet.mockRejectedValue(new Error('Access forbidden. You may not have permission to access this resource.'));
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'employee' }] });
    mockQueryDatasetData.mockResolvedValue({
      data: [
        {
          id: '2',
          displayName: 'Santiago Benvenuto',
          firstName: 'Santiago',
          lastName: 'Benvenuto',
          workEmail: 'santiago@example.com',
          department: 'AI',
          location: 'Argentina',
          supervisor: 'Alex Manager',
          status: 'Active',
        },
      ],
    });

    const result = await searchPeople({ query: 'santi' });
    const payload = JSON.parse(result.content[0].text);

    expect(mockClientGet).toHaveBeenCalledWith('/employees/directory');
    expect(mockListDatasetsData).toHaveBeenCalledWith(expect.objectContaining({ get: mockClientGet }));
    expect(mockQueryDatasetData).toHaveBeenCalledWith(expect.objectContaining({ get: mockClientGet }), 'employee', expect.any(Object));
    expect(payload.source).toBe('dataset');
    expect(payload.dataset).toBe('employee');
    expect(payload.count).toBe(1);
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

  it('should fail clearly when directory access is unavailable and no employee dataset is discoverable', async () => {
    mockClientGet.mockRejectedValue(new Error('Access forbidden. You may not have permission to access this resource.'));
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'timeOff' }] });

    const result = await searchPeople({ query: 'jane' });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain('Could not determine the BambooHR employee dataset');
  });
});
