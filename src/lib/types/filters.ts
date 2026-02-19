// ─── Filter System Types ─────────────────────────────────────────────────────

export interface FilterConfig {
	status: string[];
	priority: string[];
	assignee: string[];
	label: string[];
	type: string[];
	dueDateFrom: number | null;
	dueDateTo: number | null;
	search: string;
}

export interface SortConfig {
	column: SortColumn;
	direction: 'asc' | 'desc';
}

export type SortColumn =
	| 'number'
	| 'priority'
	| 'title'
	| 'status'
	| 'assignee'
	| 'dueDate'
	| 'created'
	| 'updated';

export type GroupByOption = 'none' | 'status' | 'assignee' | 'priority' | 'label';

export interface ViewConfig {
	filters: FilterConfig;
	sort: SortConfig;
	groupBy: GroupByOption;
}

export interface SavedViewData {
	filters: FilterConfig;
	sort: SortConfig;
	groupBy: GroupByOption;
}

export interface TaskGroup {
	key: string;
	label: string;
	color?: string;
	tasks: EnrichedTask[];
}

export interface EnrichedTask {
	id: string;
	number: number;
	title: string;
	description: string | null;
	statusId: string;
	type: string;
	priority: string;
	assigneeId: string | null;
	assigneeName: string | null;
	parentId: string | null;
	dueDate: number | null;
	startDate: number | null;
	position: number;
	createdAt: number;
	updatedAt: number;
	estimatePoints: number | null;
	labels: Array<{ labelId: string; name: string; color: string }>;
	checklistTotal: number;
	checklistDone: number;
	commentCount: number;
	subtaskTotal: number;
	subtaskDone: number;
}

export interface ProcessedView {
	tasks: EnrichedTask[];
	groups: TaskGroup[] | null;
	totalCount: number;
	filteredCount: number;
}

export interface FilterContext {
	statuses: Array<{ id: string; name: string; color: string; position: number; isClosed?: boolean }>;
	members: Array<{ id: string; name: string; email: string }>;
	labels: Array<{ id: string; name: string; color: string }>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
	status: [],
	priority: [],
	assignee: [],
	label: [],
	type: [],
	dueDateFrom: null,
	dueDateTo: null,
	search: ''
};

export const DEFAULT_SORT_CONFIG: SortConfig = {
	column: 'number',
	direction: 'desc'
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
	filters: { ...DEFAULT_FILTER_CONFIG },
	sort: { ...DEFAULT_SORT_CONFIG },
	groupBy: 'none'
};

export const PRIORITY_ORDER: Record<string, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3
};

export const PRIORITY_OPTIONS = [
	{ value: 'urgent', label: 'Urgent' },
	{ value: 'high', label: 'High' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'low', label: 'Low' }
];

export const TYPE_OPTIONS = [
	{ value: 'task', label: 'Task' },
	{ value: 'bug', label: 'Bug' },
	{ value: 'feature', label: 'Feature' },
	{ value: 'improvement', label: 'Improvement' }
];
