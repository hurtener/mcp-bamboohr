import {
  changeTimeOffRequestStatusData,
  createTimeOffRequestData,
  getChangedEmployeeIdsData,
  getChangedTableRowsData,
  getDatasetFieldOptionsData,
  getDatasetFieldsData,
  getEmployeeTableData,
  getEmployeeTimeOffPoliciesData,
  getTabularFieldsData,
  listDatasetsData,
  listTimeOffPoliciesData,
  queryDatasetData,
  resolveEmployeeDatasetName,
} from '../bambooData';

describe('bambooData', () => {
  const client = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    getBaseUrl: jest.fn(() => 'https://acme.bamboohr.com/api/v1'),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should map dataset and metadata endpoints correctly', async () => {
    client.get.mockResolvedValue({});
    client.post.mockResolvedValue({});

    await listDatasetsData(client);
    await getDatasetFieldsData(client, 'employees');
    await getTabularFieldsData(client);
    await getEmployeeTableData(client, '123', 'jobInfo');
    await getChangedEmployeeIdsData(client, { since: '2025-01-01T00:00:00Z' });
    await getChangedTableRowsData(client, 'compensation', { since: '2025-01-01T00:00:00Z' });
    await listTimeOffPoliciesData(client);
    await getEmployeeTimeOffPoliciesData(client, '123');
    await getDatasetFieldOptionsData(client, 'employees', { fields: ['department'] });
    await queryDatasetData(client, 'employees', { fields: ['id'] });

    expect(client.get).toHaveBeenCalledWith('/datasets');
    expect(client.get).toHaveBeenCalledWith('/datasets/employees/fields');
    expect(client.get).toHaveBeenCalledWith('/meta/tables');
    expect(client.get).toHaveBeenCalledWith('/employees/123/tables/jobInfo');
    expect(client.get).toHaveBeenCalledWith('/employees/changed', { since: '2025-01-01T00:00:00Z' });
    expect(client.get).toHaveBeenCalledWith('/employees/changed/tables/compensation', { since: '2025-01-01T00:00:00Z' });
    expect(client.get).toHaveBeenCalledWith('/meta/time_off/policies');
    expect(client.get).toHaveBeenCalledWith('https://acme.bamboohr.com/api/v1_1/employees/123/time_off/policies');
    expect(client.post).toHaveBeenCalledWith('/datasets/employees/field-options', { fields: ['department'] });
    expect(client.post).toHaveBeenCalledWith('/datasets/employees', { fields: ['id'] });
  });

  it('should map mutation endpoints correctly', async () => {
    client.post.mockResolvedValue({});
    client.put.mockResolvedValue({});

    await createTimeOffRequestData(client, '123', { start: '2025-05-01' });
    await changeTimeOffRequestStatusData(client, '99', 'approve', { note: 'approved', status: 'deny' });

    expect(client.put).toHaveBeenCalledWith('/employees/123/time_off/request', { start: '2025-05-01' });
    expect(client.put).toHaveBeenCalledWith('/time_off/requests/99/status', {
      status: 'approve',
      note: 'approved',
    });
  });

  it('should resolve the employee dataset name from discoverable datasets', () => {
    expect(resolveEmployeeDatasetName({
      datasets: [{ name: 'employee' }],
    })).toBe('employee');

    expect(resolveEmployeeDatasetName({
      datasets: [{ name: 'people', label: 'Employees' }],
    })).toBe('people');
  });
});
