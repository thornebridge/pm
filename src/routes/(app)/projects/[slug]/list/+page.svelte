<script lang="ts">
	import DataTable from '$lib/components/table/DataTable.svelte';
	import BulkActions from '$lib/components/task/BulkActions.svelte';
	import { getFilters, getSort, getGroupBy, setSort } from '$lib/stores/filters.svelte.js';
	import { processTaskView } from '$lib/utils/taskFilters.js';
	import type { EnrichedTask } from '$lib/types/filters.js';

	let { data } = $props();

	let selectedIds = $state<string[]>([]);
	let focusedIndex = $state(-1);

	const context = $derived({ statuses: data.statuses, members: data.members, labels: data.labels });
	const result = $derived(
		processTaskView(data.tasks as EnrichedTask[], getFilters(), getSort(), getGroupBy(), context)
	);

	function handleListKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

		const tasks = result.tasks;
		if (e.key === 'j') {
			e.preventDefault();
			focusedIndex = Math.min(focusedIndex + 1, tasks.length - 1);
		} else if (e.key === 'k') {
			e.preventDefault();
			focusedIndex = Math.max(focusedIndex - 1, 0);
		} else if (e.key === 'Enter' && focusedIndex >= 0 && tasks[focusedIndex]) {
			e.preventDefault();
			window.location.href = `/projects/${data.project.slug}/task/${tasks[focusedIndex].number}`;
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} - List</title>
</svelte:head>

<svelte:window onkeydown={handleListKeydown} />

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">List</h2>
	</div>

	<DataTable
		tasks={result.tasks}
		groups={result.groups}
		statuses={data.statuses}
		projectSlug={data.project.slug}
		projectId={data.project.id}
		members={data.members}
		sort={getSort()}
		onsortchange={setSort}
		bind:selectedIds
		{focusedIndex}
	/>
</div>

<BulkActions
	{selectedIds}
	projectId={data.project.id}
	statuses={data.statuses}
	members={data.members}
	onclear={() => (selectedIds = [])}
/>
