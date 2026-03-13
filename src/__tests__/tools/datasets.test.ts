const mockListDatasetsData = jest.fn();
const mockGetDatasetFieldsData = jest.fn();
const mockGetDatasetFieldOptionsData = jest.fn();
const mockQueryDatasetData = jest.fn();
const mockGetTabularFieldsData = jest.fn();
const mockGetEmployeeTableData = jest.fn();
const mockGetChangedEmployeeIdsData = jest.fn();
const mockGetChangedTableRowsData = jest.fn();
const mockGetBambooClientForRequest = jest.fn(() => ({}));

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: mockGetBambooClientForRequest,
}));

jest.mock('../../bambooData', () => ({
  listDatasetsData: mockListDatasetsData,
  getDatasetFieldsData: mockGetDatasetFieldsData,
  getDatasetFieldOptionsData: mockGetDatasetFieldOptionsData,
  queryDatasetData: mockQueryDatasetData,
  getTabularFieldsData: mockGetTabularFieldsData,
  getEmployeeTableData: mockGetEmployeeTableData,
  getChangedEmployeeIdsData: mockGetChangedEmployeeIdsData,
  getChangedTableRowsData: mockGetChangedTableRowsData,
}));

import {
  getChangedEmployeeIds,
  getChangedTableRows,
  getDatasetFieldOptions,
  getDatasetFields,
  getEmployeeTable,
  getTabularFields,
  listDatasets,
  queryDataset,
} from '../../tools/datasets';

describe('Dataset Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list datasets', async () => {
    mockListDatasetsData.mockResolvedValue({ datasets: [{ name: 'employees' }] });
    const result = await listDatasets();
    expect(JSON.parse(result.content[0].text)).toEqual({ datasets: [{ name: 'employees' }] });
  });

  it('should get dataset fields', async () => {
    mockGetDatasetFieldsData.mockResolvedValue({ fields: [{ name: 'department' }] });
    const result = await getDatasetFields({ datasetName: 'employees' });
    expect(mockGetDatasetFieldsData).toHaveBeenCalledWith({}, 'employees');
    expect(JSON.parse(result.content[0].text)).toEqual({ fields: [{ name: 'department' }] });
  });

  it('should build field-options payload when request is not provided', async () => {
    mockGetDatasetFieldOptionsData.mockResolvedValue({ department: ['Engineering'] });
    const result = await getDatasetFieldOptions({
      datasetName: 'employees',
      fields: ['department'],
      filters: { status: 'active' },
    });
    expect(mockGetDatasetFieldOptionsData).toHaveBeenCalledWith({}, 'employees', {
      fields: ['department'],
      filters: { status: 'active' },
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ department: ['Engineering'] });
  });

  it('should query a dataset', async () => {
    mockQueryDatasetData.mockResolvedValue({ data: [{ id: '1' }] });
    const result = await queryDataset({
      datasetName: 'employees',
      query: { fields: ['id'], showHistory: false },
    });
    expect(mockQueryDatasetData).toHaveBeenCalledWith({}, 'employees', { fields: ['id'], showHistory: false });
    expect(JSON.parse(result.content[0].text)).toEqual({ data: [{ id: '1' }] });
  });

  it('should expose tabular fields and changed sync endpoints', async () => {
    mockGetTabularFieldsData.mockResolvedValue({ fields: [{ name: 'jobTitle' }] });
    mockGetEmployeeTableData.mockResolvedValue([{ id: 1 }]);
    mockGetChangedEmployeeIdsData.mockResolvedValue({ employeeIds: ['1'] });
    mockGetChangedTableRowsData.mockResolvedValue({ rows: [{ id: 1 }] });

    expect(JSON.parse((await getTabularFields()).content[0].text)).toEqual({ fields: [{ name: 'jobTitle' }] });
    expect(JSON.parse((await getEmployeeTable({ employeeId: '123', table: 'jobInfo' })).content[0].text)).toEqual([{ id: 1 }]);
    expect(JSON.parse((await getChangedEmployeeIds({ since: '2025-01-01T00:00:00Z' })).content[0].text)).toEqual({ employeeIds: ['1'] });
    expect(JSON.parse((await getChangedTableRows({ table: 'jobInfo', since: '2025-01-01T00:00:00Z' })).content[0].text)).toEqual({ rows: [{ id: 1 }] });
  });

  it('should surface dataset tool errors', async () => {
    mockQueryDatasetData.mockRejectedValue(new Error('Dataset unavailable'));
    const result = await queryDataset({ datasetName: 'employees', query: {} });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain('Error querying dataset: Dataset unavailable');
  });
});
