import type {
	FilterConfig,
	SortConfig,
	GroupByOption,
	EnrichedTask,
	TaskGroup,
	ProcessedView,
	FilterContext,
	SavedViewData
} from '$lib/types/filters.js';
import {
	DEFAULT_FILTER_CONFIG,
	DEFAULT_SORT_CONFIG,
	PRIORITY_ORDER
} from '$lib/types/filters.js';

// ─── Filtering ───────────────────────────────────────────────────────────────

export function applyFilters(tasks: EnrichedTask[], config: FilterConfig): EnrichedTask[] {
	let result = tasks.filter((t) => !t.parentId);

	if (config.status.length > 0) {
		const set = new Set(config.status);
		result = result.filter((t) => set.has(t.statusId));
	}

	if (config.priority.length > 0) {
		const set = new Set(config.priority);
		result = result.filter((t) => set.has(t.priority));
	}

	if (config.assignee.length > 0) {
		const set = new Set(config.assignee);
		result = result.filter((t) => {
			if (!t.assigneeId) return set.has('__unassigned__');
			return set.has(t.assigneeId);
		});
	}

	if (config.label.length > 0) {
		const set = new Set(config.label);
		result = result.filter((t) => t.labels.some((l) => set.has(l.labelId)));
	}

	if (config.type.length > 0) {
		const set = new Set(config.type);
		result = result.filter((t) => set.has(t.type));
	}

	if (config.dueDateFrom != null) {
		result = result.filter((t) => t.dueDate != null && t.dueDate >= config.dueDateFrom!);
	}

	if (config.dueDateTo != null) {
		result = result.filter((t) => t.dueDate != null && t.dueDate <= config.dueDateTo!);
	}

	if (config.search) {
		const q = config.search.toLowerCase();
		result = result.filter(
			(t) =>
				t.title.toLowerCase().includes(q) ||
				String(t.number).includes(q)
		);
	}

	return result;
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

export function applySorting(
	tasks: EnrichedTask[],
	sort: SortConfig,
	statuses: FilterContext['statuses']
): EnrichedTask[] {
	const statusPositionMap = new Map(statuses.map((s) => [s.id, s.position]));
	const sorted = [...tasks];

	sorted.sort((a, b) => {
		let result = 0;
		switch (sort.column) {
			case 'number':
				result = a.number - b.number;
				break;
			case 'priority':
				result = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
				break;
			case 'title':
				result = a.title.localeCompare(b.title);
				break;
			case 'status':
				result = (statusPositionMap.get(a.statusId) ?? 0) - (statusPositionMap.get(b.statusId) ?? 0);
				break;
			case 'assignee':
				result = (a.assigneeName ?? '').localeCompare(b.assigneeName ?? '');
				break;
			case 'dueDate':
				result = (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
				break;
			case 'created':
				result = a.createdAt - b.createdAt;
				break;
			case 'updated':
				result = a.updatedAt - b.updatedAt;
				break;
		}
		return sort.direction === 'asc' ? result : -result;
	});

	return sorted;
}

// ─── Grouping ────────────────────────────────────────────────────────────────

export function applyGrouping(
	tasks: EnrichedTask[],
	groupBy: GroupByOption,
	context: FilterContext
): TaskGroup[] | null {
	if (groupBy === 'none') return null;

	switch (groupBy) {
		case 'status': {
			const sorted = [...context.statuses].sort((a, b) => a.position - b.position);
			const groups: TaskGroup[] = sorted.map((s) => ({
				key: s.id,
				label: s.name,
				color: s.color,
				tasks: []
			}));
			const groupMap = new Map(groups.map((g) => [g.key, g]));
			for (const task of tasks) {
				const group = groupMap.get(task.statusId);
				if (group) group.tasks.push(task);
			}
			return groups;
		}

		case 'assignee': {
			const groups: TaskGroup[] = [];
			const groupMap = new Map<string, TaskGroup>();

			// Create a group for each member
			for (const m of context.members) {
				const group: TaskGroup = { key: m.id, label: m.name, tasks: [] };
				groups.push(group);
				groupMap.set(m.id, group);
			}

			// Unassigned bucket
			const unassigned: TaskGroup = { key: '__unassigned__', label: 'Unassigned', tasks: [] };
			groups.push(unassigned);

			for (const task of tasks) {
				if (task.assigneeId) {
					const group = groupMap.get(task.assigneeId);
					if (group) group.tasks.push(task);
					else unassigned.tasks.push(task);
				} else {
					unassigned.tasks.push(task);
				}
			}

			return groups;
		}

		case 'priority': {
			const order = ['urgent', 'high', 'medium', 'low'];
			const labels: Record<string, string> = {
				urgent: 'Urgent',
				high: 'High',
				medium: 'Medium',
				low: 'Low'
			};
			const colors: Record<string, string> = {
				urgent: '#dc2626',
				high: '#f97316',
				medium: '#eab308',
				low: '#22c55e'
			};

			const groups: TaskGroup[] = order.map((p) => ({
				key: p,
				label: labels[p],
				color: colors[p],
				tasks: []
			}));
			const groupMap = new Map(groups.map((g) => [g.key, g]));

			for (const task of tasks) {
				const group = groupMap.get(task.priority);
				if (group) group.tasks.push(task);
			}

			return groups;
		}

		case 'label': {
			const groups: TaskGroup[] = context.labels.map((l) => ({
				key: l.id,
				label: l.name,
				color: l.color,
				tasks: []
			}));
			const groupMap = new Map(groups.map((g) => [g.key, g]));

			const unlabeled: TaskGroup = { key: '__unlabeled__', label: 'No label', tasks: [] };
			groups.push(unlabeled);

			for (const task of tasks) {
				if (task.labels.length === 0) {
					unlabeled.tasks.push(task);
				} else {
					for (const l of task.labels) {
						const group = groupMap.get(l.labelId);
						if (group) group.tasks.push(task);
					}
				}
			}

			return groups;
		}

		default:
			return null;
	}
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export function processTaskView(
	allTasks: EnrichedTask[],
	filters: FilterConfig,
	sort: SortConfig,
	groupBy: GroupByOption,
	context: FilterContext
): ProcessedView {
	const totalCount = allTasks.filter((t) => !t.parentId).length;
	const filtered = applyFilters(allTasks, filters);
	const sorted = applySorting(filtered, sort, context.statuses);
	const groups = applyGrouping(sorted, groupBy, context);

	return {
		tasks: sorted,
		groups,
		totalCount,
		filteredCount: sorted.length
	};
}

// ─── Legacy Normalization ────────────────────────────────────────────────────

export function normalizeSavedViewData(raw: unknown): SavedViewData {
	if (!raw || typeof raw !== 'object') {
		return {
			filters: { ...DEFAULT_FILTER_CONFIG },
			sort: { ...DEFAULT_SORT_CONFIG },
			groupBy: 'none'
		};
	}

	const obj = raw as Record<string, unknown>;

	// New format — has `filters` as an object with arrays
	if (obj.filters && typeof obj.filters === 'object' && Array.isArray((obj.filters as Record<string, unknown>).status)) {
		return {
			filters: { ...DEFAULT_FILTER_CONFIG, ...(obj.filters as Partial<FilterConfig>) },
			sort: obj.sort ? { ...DEFAULT_SORT_CONFIG, ...(obj.sort as Partial<SortConfig>) } : { ...DEFAULT_SORT_CONFIG },
			groupBy: (obj.groupBy as string as GroupByOption) || 'none'
		};
	}

	// Legacy format from the old list view: { search, filterStatus, filterPriority, filterType, sortBy }
	const filters: FilterConfig = { ...DEFAULT_FILTER_CONFIG };

	if (obj.search && typeof obj.search === 'string') {
		filters.search = obj.search;
	}
	if (obj.filterStatus && typeof obj.filterStatus === 'string') {
		filters.status = [obj.filterStatus];
	}
	if (obj.filterPriority && typeof obj.filterPriority === 'string') {
		filters.priority = [obj.filterPriority];
	}
	if (obj.filterType && typeof obj.filterType === 'string') {
		filters.type = [obj.filterType];
	}

	const sort: SortConfig = { ...DEFAULT_SORT_CONFIG };
	if (obj.sortBy === 'priority') {
		sort.column = 'priority';
		sort.direction = 'asc';
	} else if (obj.sortBy === 'created') {
		sort.column = 'created';
		sort.direction = 'desc';
	}

	return { filters, sort, groupBy: 'none' };
}
