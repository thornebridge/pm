<script lang="ts">
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.project.name} - Calendar</title>
</svelte:head>

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Calendar</h2>
	</div>

	<CalendarGrid
		tasks={data.tasks}
		projectSlug={data.project.slug}
	/>
</div>
