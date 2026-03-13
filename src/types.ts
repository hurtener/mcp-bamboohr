// BambooHR API Response Types

/** Employee object as returned by directory and get-employee endpoints */
export interface Employee {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string | null;
  email?: string;
  workEmail?: string;
  jobTitle?: string | null;
  department?: string | null;
  division?: string | null;
  location?: string | null;
  workPhone?: string | null;
  mobilePhone?: string;
  status?: string;
  supervisor?: string | null;
  linkedIn?: string | null;
  pronouns?: string | null;
  photoUploaded?: boolean;
  photoUrl?: string | null;
  canUploadPhoto?: number;
  [key: string]: any; // For dynamic field responses
}

/** Employee directory response structure */
export interface EmployeeDirectory {
  employees: Employee[];
}

/** Time off request status information */
export interface TimeOffRequestStatus {
  lastChanged: string;
  lastChangedByUserId: string;
  status: string; // e.g., "approved", "requested", "denied"
}

/** Time off request object */
export interface TimeOffRequest {
  id: string;
  employeeId: string;
  name: string;
  status: TimeOffRequestStatus;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  created: string; // YYYY-MM-DD
  type: {
    id: string;
    name: string;
    icon: string;
  };
  amount: {
    unit: string; // "days" or "hours"
    amount: string; // Amount as string
  };
  actions: {
    view: boolean;
    edit: boolean;
    cancel: boolean;
    approve: boolean;
    deny: boolean;
    bypass: boolean;
  };
  dates: Record<string, string>; // Date -> amount mapping as strings
  notes: {
    employee?: string;
    manager?: string;
  };
}

export interface TimeOffRequests {
  requests: TimeOffRequest[];
}

/** Who's out event - can be timeOff or holiday */
export interface WhosOutEvent {
  id: number;
  type: 'timeOff' | 'holiday';
  employeeId?: number; // Only for timeOff events
  name: string; // Employee name for timeOff, holiday name for holiday
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/** Who's out response - returns array of mixed timeOff and holiday events */
export type WhosOut = WhosOutEvent[];

/** Milestone within a goal */
export interface GoalMilestone {
  id: number;
  employeeGoalId: number;
  title: string;
  currentValue?: string | null;
  startValue?: string | null;
  endValue?: string | null;
  completedDateTime?: string | null;
  lastUpdateDateTime: string;
  lastUpdateUserId: number;
}

/** Goal actions available to the user */
export interface GoalActions {
  canEditGoalProgressBar: boolean;
  canEditGoalMilestoneProgressBar: boolean;
}

/** Employee goal object */
export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  percentComplete: number;
  alignsWithOptionId?: string | null;
  sharedWithEmployeeIds: number[];
  dueDate?: string | null;
  completionDate?: string | null;
  lastChangedDateTime: string;
  status: string; // e.g., "in_progress", "completed", etc.
  milestones?: GoalMilestone[]; // Only present for goals with milestones
  actions?: GoalActions;
}

/** Goals response structure */
export interface Goals {
  goals: Goal[];
}

/** Company file object */
export interface CompanyFile {
  id: string;
  name: string;
  originalFileName: string;
  size: number;
  dateCreated: string;
  createdBy: string;
  shareWithEmployees: string; // "yes" or "no"
  canRenameFile: string; // "yes" or "no"
  canDeleteFile: string; // "yes" or "no"
}

/** Company file category */
export interface CompanyFileCategory {
  id: string;
  name: string;
  canUploadFiles: string; // "yes" or "no"
  files: CompanyFile[];
}

/** Company files response structure - XML converted to JSON */
export interface CompanyFiles {
  categories: CompanyFileCategory[];
}

/** BambooHR field definition */
export interface Field {
  id: string | number; // Can be numeric ID or string like "4491.1"
  name: string;
  type: string; // "text", "currency", "percentage", "list", etc.
  alias?: string;
  deprecated?: boolean;
}

export interface Fields {
  fields: Field[];
}


/** Time off balance for a specific type */
export interface TimeOffBalance {
  timeOffType: string; // ID of the time off type
  name: string; // Display name (e.g., "Vacation", "Sick Leave")
  units: string; // e.g., "days", "hours"
  balance: string; // Current balance as string (e.g., "10.00")
  end: string; // Date string (YYYY-MM-DD)
  policyType: string; // e.g., "accruing", "discretionary", "manual"
  usedYearToDate: string; // Used amount this year as string (e.g., "10.00")
}

/** Time off balance response structure - returns array directly */
export type TimeOffBalances = TimeOffBalance[];

export interface DatasetDefinition {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  [key: string]: any;
}

export interface DatasetDefinitions {
  datasets: DatasetDefinition[];
  [key: string]: any;
}

export interface DatasetFieldDefinition {
  id?: string;
  name: string;
  label?: string;
  type?: string;
  filterable?: boolean;
  [key: string]: any;
}

export interface DatasetFieldDefinitions {
  fields: DatasetFieldDefinition[];
  [key: string]: any;
}

export interface DatasetFieldOptionsResponse {
  [key: string]: any;
}

export interface DatasetQueryResponse {
  [key: string]: any;
}

export interface TabularFieldDefinition {
  id?: string;
  tableName?: string;
  name: string;
  alias?: string;
  type?: string;
  [key: string]: any;
}

export interface TabularFieldDefinitions {
  fields: TabularFieldDefinition[];
  [key: string]: any;
}

export interface ChangedEmployeeIdsResponse {
  employees?: Array<string | number>;
  employeeIds?: Array<string | number>;
  [key: string]: any;
}

export interface ChangedTableRowsResponse {
  employees?: any[];
  rows?: any[];
  [key: string]: any;
}

export interface TimeOffPoliciesResponse {
  [key: string]: any;
}

export interface EmployeeTimeOffPoliciesResponse {
  [key: string]: any;
}

// Error response type
export interface BambooErrorResponse {
  errors?: Array<{
    error: string;
    description?: string;
  }>;
  message?: string;
}
