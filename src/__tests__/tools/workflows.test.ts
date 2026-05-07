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

import { getDirectReports, getEmployeeHistory, getOrgSubtree, searchPeople } from '../../tools/workflows';

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

  it('should return direct reports from the employee directory', async () => {
    mockClientGet.mockResolvedValue({
      employees: [
        { id: '1', displayName: 'Alex Manager', supervisorId: null, status: 'Active' },
        { id: '2', displayName: 'Jane Doe', supervisorId: '1', status: 'Active', jobTitle: 'Engineer' },
        { id: '3', displayName: 'John Roe', supervisorId: '1', status: 'Active' },
        { id: '4', displayName: 'Other', supervisorId: '99', status: 'Active' },
      ],
    });

    const result = await getDirectReports({ employeeId: '1' });
    const payload = JSON.parse(result.content[0].text);

    expect(mockClientGet).toHaveBeenCalledWith('/employees/directory');
    expect(payload.source).toBe('directory');
    expect(payload.managerId).toBe('1');
    expect(payload.count).toBe(2);
    expect(payload.directReports.map((r: any) => r.id)).toEqual(['2', '3']);
    expect(payload.directReports[0].managerId).toBe('1');
  });

  it('should fall back to dataset-supplied supervisorEId when listing direct reports', async () => {
    mockClientGet.mockRejectedValue(new Error('Access forbidden. You may not have permission to access this resource.'));
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'employee' }] });
    mockQueryDatasetData.mockResolvedValue({
      data: [
        { id: '10', displayName: 'Boss', supervisorEId: null, status: 'Active' },
        { id: '11', displayName: 'Report A', supervisorEId: '10', status: 'Active' },
        { id: '12', displayName: 'Report B', supervisorEId: '10', status: 'Terminated' },
      ],
    });

    const result = await getDirectReports({ employeeId: '10', status: 'active' });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.source).toBe('dataset');
    expect(payload.dataset).toBe('employee');
    expect(payload.managerId).toBe('10');
    expect(payload.count).toBe(1);
    expect(payload.directReports[0].id).toBe('11');
    expect(payload.filtersApplied.status).toBe('active');
  });

  it('should walk the org chart down to maxDepth and bound output via maxNodes', async () => {
    mockClientGet.mockResolvedValue({
      employees: [
        { id: '1', displayName: 'Root', supervisorId: null, status: 'Active' },
        { id: '2', displayName: 'L1-A', supervisorId: '1', status: 'Active' },
        { id: '3', displayName: 'L1-B', supervisorId: '1', status: 'Active' },
        { id: '4', displayName: 'L2-A1', supervisorId: '2', status: 'Active' },
        { id: '5', displayName: 'L2-A2', supervisorId: '2', status: 'Active' },
        { id: '6', displayName: 'L3-only-when-deep', supervisorId: '4', status: 'Active' },
      ],
    });

    const shallow = await getOrgSubtree({ employeeId: '1', maxDepth: 1 });
    const shallowPayload = JSON.parse(shallow.content[0].text);

    expect(shallowPayload.rootEmployeeId).toBe('1');
    expect(shallowPayload.tree.directReports).toHaveLength(2);
    expect(shallowPayload.tree.directReports[0].directReports).toEqual([]);
    expect(shallowPayload.tree.directReports[0].directReportCount).toBeGreaterThan(0);
    expect(shallowPayload.truncated).toBe(true);

    const deep = await getOrgSubtree({ employeeId: '1', maxDepth: 5 });
    const deepPayload = JSON.parse(deep.content[0].text);

    expect(deepPayload.totalNodes).toBe(6);
    expect(deepPayload.truncated).toBe(false);
    const branchA = deepPayload.tree.directReports.find((node: any) => node.id === '2');
    expect(branchA.directReports.map((n: any) => n.id).sort()).toEqual(['4', '5']);
    const grandchild = branchA.directReports.find((node: any) => node.id === '4');
    expect(grandchild.directReports.map((n: any) => n.id)).toEqual(['6']);

    const capped = await getOrgSubtree({ employeeId: '1', maxDepth: 5, maxNodes: 3 });
    const cappedPayload = JSON.parse(capped.content[0].text);
    expect(cappedPayload.totalNodes).toBe(3);
    expect(cappedPayload.truncated).toBe(true);
  });

  it('should report when the requested org-subtree root is missing', async () => {
    mockClientGet.mockResolvedValue({
      employees: [{ id: '1', displayName: 'Root', supervisorId: null }],
    });

    const result = await getOrgSubtree({ employeeId: '999' });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.found).toBe(false);
    expect(payload.tree).toBeNull();
  });

  it('should fail clearly when directory access is unavailable and no employee dataset is discoverable', async () => {
    mockClientGet.mockRejectedValue(new Error('Access forbidden. You may not have permission to access this resource.'));
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'timeOff' }] });

    const result = await searchPeople({ query: 'jane' });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain('Could not determine the BambooHR employee dataset');
  });
});
