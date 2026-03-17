const mockAddTimeOffHistoryItemData = jest.fn();
const mockAssignEmployeeTimeOffPoliciesData = jest.fn();
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
  addTimeOffHistoryItemData: mockAddTimeOffHistoryItemData,
  assignEmployeeTimeOffPoliciesData: mockAssignEmployeeTimeOffPoliciesData,
  listTimeOffPoliciesData: mockListTimeOffPoliciesData,
  getEmployeeTimeOffPoliciesData: mockGetEmployeeTimeOffPoliciesData,
  createTimeOffRequestData: mockCreateTimeOffRequestData,
  changeTimeOffRequestStatusData: mockChangeTimeOffRequestStatusData,
}));

import {
  addTimeOffHistoryItem,
  assignEmployeeTimeOffPolicies,
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
    mockAddTimeOffHistoryItemData.mockResolvedValue({
      status: 201,
      headers: { location: '/employees/123/time_off/history/5' },
      data: null,
    });
    mockAssignEmployeeTimeOffPoliciesData.mockResolvedValue({ employeeId: '123', updated: 1 });

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
    const historyResult = await addTimeOffHistoryItem({
      employeeId: '123',
      payload: { date: '2025-05-01', amount: '8.0' },
      confirm: true,
    });
    const policyResult = await assignEmployeeTimeOffPolicies({
      employeeId: '123',
      assignments: [{ timeOffPolicyId: 9, accrualStartDate: null }],
      confirm: true,
    });

    expect(mockEnsureMutationsEnabled).toHaveBeenCalledTimes(4);
    expect(mockEnsureMutationsEnabled).toHaveBeenCalledWith(true);
    expect(mockCreateTimeOffRequestData).toHaveBeenCalledWith({}, '123', { start: '2025-05-01' });
    expect(mockChangeTimeOffRequestStatusData).toHaveBeenCalledWith({}, 'req-1', 'approve', { note: 'ok' });
    expect(mockAddTimeOffHistoryItemData).toHaveBeenCalledWith({}, '123', { date: '2025-05-01', amount: '8.0' });
    expect(mockAssignEmployeeTimeOffPoliciesData).toHaveBeenCalledWith({}, '123', [{ timeOffPolicyId: 9, accrualStartDate: null }]);
    expect(JSON.parse(createResult.content[0].text)).toEqual({ id: 'req-1' });
    expect(JSON.parse(statusResult.content[0].text)).toEqual({ status: 'approve' });
    expect(JSON.parse(historyResult.content[0].text)).toEqual({
      status: 201,
      location: '/employees/123/time_off/history/5',
      data: null,
    });
    expect(JSON.parse(policyResult.content[0].text)).toEqual({ employeeId: '123', updated: 1 });
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

  it('should surface write-tool errors for new time off tools', async () => {
    mockEnsureMutationsEnabled.mockImplementation(() => undefined);
    mockAddTimeOffHistoryItemData.mockRejectedValue(new Error('history write failed'));
    mockAssignEmployeeTimeOffPoliciesData.mockRejectedValue(new Error('policy write failed'));

    const historyResult = await addTimeOffHistoryItem({
      employeeId: '123',
      payload: { date: '2025-05-01' },
      confirm: true,
    });
    const policyResult = await assignEmployeeTimeOffPolicies({
      employeeId: '123',
      assignments: [{ timeOffPolicyId: 9, accrualStartDate: '2025-01-01' }],
      confirm: true,
    });

    expect((historyResult as any).isError).toBe(true);
    expect(historyResult.content[0].text).toContain('Error adding time off history item: history write failed');
    expect((policyResult as any).isError).toBe(true);
    expect(policyResult.content[0].text).toContain('Error assigning employee time off policies: policy write failed');
  });
});
