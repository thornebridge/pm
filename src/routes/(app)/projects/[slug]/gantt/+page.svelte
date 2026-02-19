<script lang="ts">
	import GanttChart from '$lib/components/gantt/GanttChart.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.project.name} - Gantt</title>
</svelte:head>

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Gantt</h2>
	</div>

	<GanttChart
		tasks={data.tasks}
		statuses={data.statuses}
		projectSlug={data.project.slug}
	/>
</div>
