<script lang="ts">
	import type { FilterConfig, FilterContext } from '$lib/types/filters.js';
	import { setFilters, clearFilters } from '$lib/stores/filters.svelte.js';

	interface Props {
		filters: FilterConfig;
		context: FilterContext;
	}

	let { filters, context }: Props = $props();

	const statusMap = $derived(new Map(context.statuses.map((s) => [s.id, s])));
	const memberMap = $derived(new Map(context.members.map((m) => [m.id, m])));
	const labelMap = $derived(new Map(context.labels.map((l) => [l.id, l])));

	interface Pill {
		dimension: keyof FilterConfig;
		label: string;
		values: string;
		removeValue?: string;
	}

	const pills = $derived.by(() => {
		const result: Pill[] = [];

		if (filters.status.length > 0) {
			const names = filters.status.map((id) => statusMap.get(id)?.name ?? id).join(', ');
			result.push({ dimension: 'status', label: 'Status', values: names });
		}
		if (filters.priority.length > 0) {
			const names = filters.priority.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
			result.push({ dimension: 'priority', label: 'Priority', values: names });
		}
		if (filters.assignee.length > 0) {
			const names = filters.assignee
				.map((id) => (id === '__unassigned__' ? 'Unassigned' : memberMap.get(id)?.name ?? id))
				.join(', ');
			result.push({ dimension: 'assignee', label: 'Assignee', values: names });
		}
		if (filters.label.length > 0) {
			const names = filters.label.map((id) => labelMap.get(id)?.name ?? id).join(', ');
			result.push({ dimension: 'label', label: 'Label', values: names });
		}
		if (filters.type.length > 0) {
			const names = filters.type.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
			result.push({ dimension: 'type', label: 'Type', values: names });
		}
		if (filters.dueDateFrom != null || filters.dueDateTo != null) {
			let val = '';
			if (filters.dueDateFrom) val += new Date(filters.dueDateFrom).toLocaleDateString();
			if (filters.dueDateFrom && filters.dueDateTo) val += ' - ';
			if (filters.dueDateTo) val += new Date(filters.dueDateTo).toLocaleDateString();
			result.push({ dimension: 'dueDateFrom', label: 'Due', values: val });
		}
		if (filters.search) {
			result.push({ dimension: 'search', label: 'Search', values: `"${filters.search}"` });
		}

		return result;
	});

	function removePill(pill: Pill) {
		switch (pill.dimension) {
			case 'status':
				setFilters({ status: [] });
				break;
			case 'priority':
				setFilters({ priority: [] });
				break;
			case 'assignee':
				setFilters({ assignee: [] });
				break;
			case 'label':
				setFilters({ label: [] });
				break;
			case 'type':
				setFilters({ type: [] });
				break;
			case 'dueDateFrom':
			case 'dueDateTo':
				setFilters({ dueDateFrom: null, dueDateTo: null });
				break;
			case 'search':
				setFilters({ search: '' });
				break;
		}
	}
</script>

{#if pills.length > 0}
	<div class="flex flex-wrap items-center gap-1">
		{#each pills as pill (pill.dimension)}
			<span class="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-[11px] text-surface-700 dark:bg-surface-800 dark:text-surface-300">
				<span class="font-medium">{pill.label}:</span>
				<span class="max-w-32 truncate">{pill.values}</span>
				<button
					type="button"
					onclick={() => removePill(pill)}
					class="ml-0.5 text-surface-400 hover:text-red-500"
				>&times;</button>
			</span>
		{/each}
		<button
			type="button"
			onclick={clearFilters}
			class="text-[10px] text-surface-500 hover:text-red-500"
		>Clear all</button>
	</div>
{/if}
