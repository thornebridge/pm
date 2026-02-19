<script lang="ts">
	import GanttChart from '$lib/components/gantt/GanttChart.svelte';
	import { getFilters } from '$lib/stores/filters.svelte.js';
	import { applyFilters } from '$lib/utils/taskFilters.js';
	import type { EnrichedTask } from '$lib/types/filters.js';

	let { data } = $props();

	const filteredTasks = $derived(applyFilters(data.tasks as EnrichedTask[], getFilters()));
</script>

<svelte:head>
	<title>{data.project.name} - Gantt</title>
</svelte:head>

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Gantt</h2>
	</div>

	<GanttChart
		tasks={filteredTasks}
		statuses={data.statuses}
		projectSlug={data.project.slug}
	/>
</div>
