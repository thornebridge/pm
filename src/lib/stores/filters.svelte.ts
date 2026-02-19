import type {
	FilterConfig,
	SortConfig,
	GroupByOption,
	SavedViewData,
	SortColumn
} from '$lib/types/filters.js';
import {
	DEFAULT_FILTER_CONFIG,
	DEFAULT_SORT_CONFIG
} from '$lib/types/filters.js';
import { normalizeSavedViewData } from '$lib/utils/taskFilters.js';

// ─── Reactive State ──────────────────────────────────────────────────────────

let filters = $state<FilterConfig>({ ...DEFAULT_FILTER_CONFIG });
let sort = $state<SortConfig>({ ...DEFAULT_SORT_CONFIG });
let groupBy = $state<GroupByOption>('none');
let activeViewId = $state<string | null>(null);

// ─── URL Param Mapping ──────────────────────────────────────────────────────

const PARAM_MAP = {
	status: 'status',
	priority: 'priority',
	assignee: 'assignee',
	label: 'label',
	type: 'type',
	dueDateFrom: 'df',
	dueDateTo: 'dt',
	search: 'q',
	sortColumn: 'sort',
	sortDirection: 'dir',
	groupBy: 'group',
	view: 'view'
} as const;

function pushToUrl() {
	if (typeof window === 'undefined') return;

	const params = new URLSearchParams();

	if (filters.status.length) params.set(PARAM_MAP.status, filters.status.join(','));
	if (filters.priority.length) params.set(PARAM_MAP.priority, filters.priority.join(','));
	if (filters.assignee.length) params.set(PARAM_MAP.assignee, filters.assignee.join(','));
	if (filters.label.length) params.set(PARAM_MAP.label, filters.label.join(','));
	if (filters.type.length) params.set(PARAM_MAP.type, filters.type.join(','));
	if (filters.dueDateFrom != null) params.set(PARAM_MAP.dueDateFrom, String(filters.dueDateFrom));
	if (filters.dueDateTo != null) params.set(PARAM_MAP.dueDateTo, String(filters.dueDateTo));
	if (filters.search) params.set(PARAM_MAP.search, filters.search);
	if (sort.column !== DEFAULT_SORT_CONFIG.column) params.set(PARAM_MAP.sortColumn, sort.column);
	if (sort.direction !== DEFAULT_SORT_CONFIG.direction) params.set(PARAM_MAP.sortDirection, sort.direction);
	if (groupBy !== 'none') params.set(PARAM_MAP.groupBy, groupBy);
	if (activeViewId) params.set(PARAM_MAP.view, activeViewId);

	const search = params.toString();
	const newUrl = window.location.pathname + (search ? '?' + search : '');
	history.replaceState(history.state, '', newUrl);
}

// ─── Exported API ────────────────────────────────────────────────────────────

export function getFilters(): FilterConfig {
	return filters;
}

export function getSort(): SortConfig {
	return sort;
}

export function getGroupBy(): GroupByOption {
	return groupBy;
}

export function getActiveViewId(): string | null {
	return activeViewId;
}

export function setFilters(partial: Partial<FilterConfig>) {
	filters = { ...filters, ...partial };
	activeViewId = null;
	pushToUrl();
}

export function setSort(partial: Partial<SortConfig>) {
	sort = { ...sort, ...partial };
	pushToUrl();
}

export function setGroupBy(value: GroupByOption) {
	groupBy = value;
	pushToUrl();
}

export function clearFilters() {
	filters = { ...DEFAULT_FILTER_CONFIG };
	sort = { ...DEFAULT_SORT_CONFIG };
	groupBy = 'none';
	activeViewId = null;
	pushToUrl();
}

export function resetStore() {
	filters = { ...DEFAULT_FILTER_CONFIG };
	sort = { ...DEFAULT_SORT_CONFIG };
	groupBy = 'none';
	activeViewId = null;
}

export function loadSavedView(viewId: string, rawData: unknown) {
	const data = normalizeSavedViewData(rawData);
	filters = { ...DEFAULT_FILTER_CONFIG, ...data.filters };
	sort = { ...DEFAULT_SORT_CONFIG, ...data.sort };
	groupBy = data.groupBy || 'none';
	activeViewId = viewId;
	pushToUrl();
}

export function initFromUrl() {
	if (typeof window === 'undefined') return;

	const params = new URLSearchParams(window.location.search);

	const parseList = (key: string): string[] => {
		const val = params.get(key);
		return val ? val.split(',').filter(Boolean) : [];
	};

	filters = {
		status: parseList(PARAM_MAP.status),
		priority: parseList(PARAM_MAP.priority),
		assignee: parseList(PARAM_MAP.assignee),
		label: parseList(PARAM_MAP.label),
		type: parseList(PARAM_MAP.type),
		dueDateFrom: params.has(PARAM_MAP.dueDateFrom) ? Number(params.get(PARAM_MAP.dueDateFrom)) : null,
		dueDateTo: params.has(PARAM_MAP.dueDateTo) ? Number(params.get(PARAM_MAP.dueDateTo)) : null,
		search: params.get(PARAM_MAP.search) || ''
	};

	const sortCol = params.get(PARAM_MAP.sortColumn);
	const sortDir = params.get(PARAM_MAP.sortDirection);
	sort = {
		column: (sortCol as SortColumn) || DEFAULT_SORT_CONFIG.column,
		direction: (sortDir as 'asc' | 'desc') || DEFAULT_SORT_CONFIG.direction
	};

	const g = params.get(PARAM_MAP.groupBy);
	groupBy = (g as GroupByOption) || 'none';

	activeViewId = params.get(PARAM_MAP.view) || null;
}

export function toSavedViewData(): SavedViewData {
	return {
		filters: { ...filters },
		sort: { ...sort },
		groupBy
	};
}

export function hasActiveFilters(): boolean {
	return (
		filters.status.length > 0 ||
		filters.priority.length > 0 ||
		filters.assignee.length > 0 ||
		filters.label.length > 0 ||
		filters.type.length > 0 ||
		filters.dueDateFrom != null ||
		filters.dueDateTo != null ||
		filters.search !== ''
	);
}

export function activeFilterCount(): number {
	let count = 0;
	if (filters.status.length > 0) count++;
	if (filters.priority.length > 0) count++;
	if (filters.assignee.length > 0) count++;
	if (filters.label.length > 0) count++;
	if (filters.type.length > 0) count++;
	if (filters.dueDateFrom != null || filters.dueDateTo != null) count++;
	if (filters.search !== '') count++;
	return count;
}

export function getUrlSearch(): string {
	if (typeof window === 'undefined') return '';
	const params = new URLSearchParams();

	if (filters.status.length) params.set(PARAM_MAP.status, filters.status.join(','));
	if (filters.priority.length) params.set(PARAM_MAP.priority, filters.priority.join(','));
	if (filters.assignee.length) params.set(PARAM_MAP.assignee, filters.assignee.join(','));
	if (filters.label.length) params.set(PARAM_MAP.label, filters.label.join(','));
	if (filters.type.length) params.set(PARAM_MAP.type, filters.type.join(','));
	if (filters.dueDateFrom != null) params.set(PARAM_MAP.dueDateFrom, String(filters.dueDateFrom));
	if (filters.dueDateTo != null) params.set(PARAM_MAP.dueDateTo, String(filters.dueDateTo));
	if (filters.search) params.set(PARAM_MAP.search, filters.search);
	if (sort.column !== DEFAULT_SORT_CONFIG.column) params.set(PARAM_MAP.sortColumn, sort.column);
	if (sort.direction !== DEFAULT_SORT_CONFIG.direction) params.set(PARAM_MAP.sortDirection, sort.direction);
	if (groupBy !== 'none') params.set(PARAM_MAP.groupBy, groupBy);
	if (activeViewId) params.set(PARAM_MAP.view, activeViewId);

	const str = params.toString();
	return str ? '?' + str : '';
}
