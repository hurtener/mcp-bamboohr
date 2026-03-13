const mockListTimeOffPoliciesData = jest.fn();
const mockGetEmployeeTimeOffPoliciesData = jest.fn();
const mockCreateTimeOffRequestData = jest.fn();
const mockChangeTimeOffRequestStatusData = jest.fn();
const mockGetBambooClientForRequest = jest.fn(() => ({}));
const mockEnsureMutationsEnabled = jest.fn();

jest.mock('../../requestContext', () => ({
  getBambooClientForRequest: mockGetBambooClientForRequest,
}));

jest.mock('../../mutations', () => ({
  ensureMutationsEnabled: mockEnsureMutationsEnabled,
}));

jest.mock('../../bambooData', () => ({
  listTimeOffPoliciesData: mockListTimeOffPoliciesData,
  getEmployeeTimeOffPoliciesData: mockGetEmployeeTimeOffPoliciesData,
  createTimeOffRequestData: mockCreateTimeOffRequestData,
  changeTimeOffRequestStatusData: mockChangeTimeOffRequestStatusData,
}));

import {
  changeTimeOffRequestStatus,
  createTimeOffRequest,
  getEmployeeTimeOffPolicies,
  listTimeOffPolicies,
} from '../../tools/timeOffAdmin';

describe('Time Off Admin Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list and fetch policy assignments', async () => {
    mockListTimeOffPoliciesData.mockResolvedValue({ policies: [{ id: 1 }] });
    mockGetEmployeeTimeOffPoliciesData.mockResolvedValue({ employeeId: '123', policies: [] });

    expect(JSON.parse((await listTimeOffPolicies()).content[0].text)).toEqual({ policies: [{ id: 1 }] });
    expect(JSON.parse((await getEmployeeTimeOffPolicies({ employeeId: '123' })).content[0].text)).toEqual({
      employeeId: '123',
      policies: [],
    });
  });

  it('should gate mutations and then call BambooHR write endpoints', async () => {
    mockCreateTimeOffRequestData.mockResolvedValue({ id: 'req-1' });
    mockChangeTimeOffRequestStatusData.mockResolvedValue({ status: 'approve' });

    const createResult = await createTimeOffRequest({
      employeeId: '123',
      payload: { start: '2025-05-01' },
      confirm: true,
    });
    const statusResult = await changeTimeOffRequestStatus({
      requestId: 'req-1',
      action: 'approve',
      confirm: true,
      payload: { note: 'ok' },
    });

    expect(mockEnsureMutationsEnabled).toHaveBeenCalledWith(true);
    expect(mockCreateTimeOffRequestData).toHaveBeenCalledWith({}, '123', { start: '2025-05-01' });
    expect(mockChangeTimeOffRequestStatusData).toHaveBeenCalledWith({}, 'req-1', 'approve', { note: 'ok' });
    expect(JSON.parse(createResult.content[0].text)).toEqual({ id: 'req-1' });
    expect(JSON.parse(statusResult.content[0].text)).toEqual({ status: 'approve' });
  });

  it('should surface mutation guard failures as tool errors', async () => {
    mockEnsureMutationsEnabled.mockImplementation(() => {
      throw new Error('mutations disabled');
    });

    const result = await createTimeOffRequest({
      employeeId: '123',
      payload: { start: '2025-05-01' },
      confirm: false,
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain('Error creating time off request: mutations disabled');
  });
});
