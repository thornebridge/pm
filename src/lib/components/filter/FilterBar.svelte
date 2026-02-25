<script lang="ts">
	import FilterDropdown from './FilterDropdown.svelte';
	import DateRangeFilter from './DateRangeFilter.svelte';
	import ActiveFilters from './ActiveFilters.svelte';
	import SavedViewsBar from './SavedViewsBar.svelte';
	import type { FilterContext } from '$lib/types/filters.js';
	import { PRIORITY_OPTIONS, TYPE_OPTIONS } from '$lib/types/filters.js';
	import {
		getFilters,
		getSort,
		getGroupBy,
		setFilters,
		setSort,
		setGroupBy,
		hasActiveFilters
	} from '$lib/stores/filters.svelte.js';
	import type { SortColumn, GroupByOption } from '$lib/types/filters.js';

	interface SavedView {
		id: string;
		name: string;
		filters: string;
		userId: string;
		shared: boolean;
		projectId: string;
		createdAt: number;
		updatedAt: number;
	}

	interface Props {
		statuses: FilterContext['statuses'];
		members: FilterContext['members'];
		labels: FilterContext['labels'];
		projectId: string;
		currentUserId: string;
		views: SavedView[];
		onviewschange: (views: SavedView[]) => void;
		showGroupBy?: boolean;
		showSort?: boolean;
	}

	let {
		statuses,
		members,
		labels,
		projectId,
		currentUserId,
		views,
		onviewschange,
		showGroupBy = true,
		showSort = true
	}: Props = $props();

	const filters = $derived(getFilters());
	const sort = $derived(getSort());
	const groupByVal = $derived(getGroupBy());
	const filtersActive = $derived(hasActiveFilters());

	// Debounced search
	// svelte-ignore state_referenced_locally
	let searchInput = $state(filters.search);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSearchInput(e: Event) {
		searchInput = (e.target as HTMLInputElement).value;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			setFilters({ search: searchInput });
		}, 300);
	}

	// Keep search input in sync when filters change externally (e.g., clear all)
	$effect(() => {
		if (filters.search !== searchInput) {
			searchInput = filters.search;
		}
	});

	const statusOptions = $derived(
		statuses.map((s) => ({ value: s.id, label: s.name, color: s.color }))
	);

	const assigneeOptions = $derived([
		{ value: '__unassigned__', label: 'Unassigned' },
		...members.map((m) => ({ value: m.id, label: m.name }))
	]);

	const labelOptions = $derived(
		labels.map((l) => ({ value: l.id, label: l.name, color: l.color }))
	);

	const sortOptions: Array<{ value: SortColumn; label: string }> = [
		{ value: 'number', label: '# Number' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'title', label: 'Title' },
		{ value: 'status', label: 'Status' },
		{ value: 'assignee', label: 'Assignee' },
		{ value: 'dueDate', label: 'Due date' },
		{ value: 'created', label: 'Created' },
		{ value: 'updated', label: 'Updated' }
	];

	const groupByOptions: Array<{ value: GroupByOption; label: string }> = [
		{ value: 'none', label: 'None' },
		{ value: 'status', label: 'Status' },
		{ value: 'assignee', label: 'Assignee' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'label', label: 'Label' }
	];

	const context = $derived({ statuses, members, labels });
	const showRow2 = $derived(filtersActive || views.length > 0);
</script>

<div class="space-y-1.5 border-b border-surface-200 px-6 pb-2 pt-2 dark:border-surface-800">
	<!-- Row 1: Filter controls -->
	<div class="flex flex-wrap items-center gap-1.5">
		<!-- Search -->
		<div class="relative">
			<svg class="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			<input
				value={searchInput}
				oninput={handleSearchInput}
				placeholder="Search..."
				class="w-36 rounded-md border border-surface-300 bg-surface-50 py-1 pl-7 pr-2 text-xs text-surface-900 outline-none placeholder:text-surface-400 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
		</div>

		<FilterDropdown
			label="Status"
			options={statusOptions}
			selected={filters.status}
			onchange={(vals) => setFilters({ status: vals })}
		/>

		<FilterDropdown
			label="Priority"
			options={PRIORITY_OPTIONS}
			selected={filters.priority}
			onchange={(vals) => setFilters({ priority: vals })}
		/>

		<FilterDropdown
			label="Assignee"
			options={assigneeOptions}
			selected={filters.assignee}
			onchange={(vals) => setFilters({ assignee: vals })}
			searchable
		/>

		{#if labels.length > 0}
			<FilterDropdown
				label="Label"
				options={labelOptions}
				selected={filters.label}
				onchange={(vals) => setFilters({ label: vals })}
				searchable
			/>
		{/if}

		<FilterDropdown
			label="Type"
			options={TYPE_OPTIONS}
			selected={filters.type}
			onchange={(vals) => setFilters({ type: vals })}
		/>

		<DateRangeFilter
			from={filters.dueDateFrom}
			to={filters.dueDateTo}
			onchange={(f, t) => setFilters({ dueDateFrom: f, dueDateTo: t })}
		/>

		{#if showGroupBy || showSort}
			<div class="mx-1 h-4 w-px bg-surface-300 dark:bg-surface-700"></div>
		{/if}

		{#if showGroupBy}
			<select
				value={groupByVal}
				onchange={(e) => setGroupBy(e.currentTarget.value as GroupByOption)}
				class="rounded-md border border-surface-300 bg-surface-50 px-1.5 py-1 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400"
			>
				<option value="" disabled>Group by</option>
				{#each groupByOptions as opt}
					<option value={opt.value}>{opt.value === 'none' ? 'No grouping' : `Group: ${opt.label}`}</option>
				{/each}
			</select>
		{/if}

		{#if showSort}
			<select
				value={sort.column}
				onchange={(e) => setSort({ column: e.currentTarget.value as SortColumn })}
				class="rounded-md border border-surface-300 bg-surface-50 px-1.5 py-1 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400"
			>
				{#each sortOptions as opt}
					<option value={opt.value}>Sort: {opt.label}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={() => setSort({ direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
				class="rounded-md border border-surface-300 px-1.5 py-1 text-xs text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
				title="Toggle sort direction"
			>
				{sort.direction === 'asc' ? '\u2191' : '\u2193'}
			</button>
		{/if}
	</div>

	<!-- Row 2: Saved views + active filter pills -->
	{#if showRow2}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			<SavedViewsBar {views} {projectId} {currentUserId} {onviewschange} />

			{#if filtersActive}
				<div class="mx-1 h-3 w-px bg-surface-300 dark:bg-surface-700"></div>
				<ActiveFilters {filters} {context} />
			{/if}
		</div>
	{/if}
</div>
