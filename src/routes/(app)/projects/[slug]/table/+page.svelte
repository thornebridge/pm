<script lang="ts">
	import DataTable from '$lib/components/table/DataTable.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.project.name} - Table</title>
</svelte:head>

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Table</h2>
	</div>

	<DataTable
		tasks={data.tasks}
		statuses={data.statuses}
		projectSlug={data.project.slug}
		projectId={data.project.id}
		members={data.members}
	/>
</div>
