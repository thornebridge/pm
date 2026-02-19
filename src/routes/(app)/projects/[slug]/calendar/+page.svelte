<script lang="ts">
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import { getFilters } from '$lib/stores/filters.svelte.js';
	import { applyFilters } from '$lib/utils/taskFilters.js';
	import type { EnrichedTask } from '$lib/types/filters.js';

	let { data } = $props();

	const filteredTasks = $derived(applyFilters(data.tasks as EnrichedTask[], getFilters()));
</script>

<svelte:head>
	<title>{data.project.name} - Calendar</title>
</svelte:head>

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Calendar</h2>
	</div>

	<CalendarGrid
		tasks={filteredTasks}
		projectSlug={data.project.slug}
	/>
</div>
