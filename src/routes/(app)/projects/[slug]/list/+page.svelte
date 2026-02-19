<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import TaskTypeIcon from '$lib/components/task/TaskTypeIcon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import BulkActions from '$lib/components/task/BulkActions.svelte';
	import InlineQuickAdd from '$lib/components/task/InlineQuickAdd.svelte';
	import { getFilters, getSort, getGroupBy } from '$lib/stores/filters.svelte.js';
	import { processTaskView } from '$lib/utils/taskFilters.js';
	import type { EnrichedTask } from '$lib/types/filters.js';

	let { data } = $props();

	let selectedIds = $state<string[]>([]);
	let focusedIndex = $state(-1);

	const context = $derived({ statuses: data.statuses, members: data.members, labels: data.labels });
	const result = $derived(
		processTaskView(data.tasks as EnrichedTask[], getFilters(), getSort(), getGroupBy(), context)
	);

	const statusMap = $derived(new Map(data.statuses.map((s) => [s.id, s])));

	const allFilteredIds = $derived(result.tasks.map((t) => t.id));
	const allSelected = $derived(allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id)));

	function toggleAll() {
		if (allSelected) {
			selectedIds = [];
		} else {
			selectedIds = [...allFilteredIds];
		}
	}

	function toggleOne(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	// J/K navigation
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

<div class="p-6">
	<!-- Count -->
	{#if result.filteredCount !== result.totalCount}
		<div class="mb-2 text-[11px] text-surface-500">
			Showing {result.filteredCount} of {result.totalCount} tasks
		</div>
	{/if}

	<!-- Table -->
	<div class="overflow-hidden rounded-lg border border-surface-300 dark:border-surface-800">
		<table class="w-full">
			<thead>
				<tr class="border-b border-surface-300 text-left text-xs font-medium uppercase tracking-wide text-surface-500 dark:border-surface-800">
					<th class="px-3 py-2 w-8">
						<input
							type="checkbox"
							checked={allSelected}
							onchange={toggleAll}
							class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
						/>
					</th>
					<th class="px-4 py-2 w-12">#</th>
					<th class="px-4 py-2 w-8"></th>
					<th class="px-4 py-2 w-8"></th>
					<th class="px-4 py-2">Title</th>
					<th class="px-4 py-2 w-28">Status</th>
					<th class="px-4 py-2 w-20">Labels</th>
				</tr>
			</thead>
			<tbody>
				{#if result.groups}
					{#each result.groups as group (group.key)}
						<tr>
							<td colspan="7" class="border-b border-surface-200 bg-surface-100/70 px-4 py-1.5 dark:border-surface-800/50 dark:bg-surface-800/40">
								<span class="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-300">
									{#if group.color}
										<span class="h-2.5 w-2.5 rounded-full" style="background-color: {group.color}"></span>
									{/if}
									{group.label}
									<span class="font-normal text-surface-500">({group.tasks.length})</span>
								</span>
							</td>
						</tr>
						{#each group.tasks as task, i (task.id)}
							{@render taskRow(task, i)}
						{:else}
							<tr>
								<td colspan="7" class="border-b border-surface-200 px-4 py-2 text-center text-xs text-surface-400 dark:border-surface-800/50">
									No tasks
								</td>
							</tr>
						{/each}
					{/each}
				{:else}
					{#each result.tasks as task, i (task.id)}
						{@render taskRow(task, i)}
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center">
								<EmptyState icon="\uD83D\uDD0D" title="No tasks found" description="Try adjusting your filters." compact />
							</td>
						</tr>
					{/each}
				{/if}
				<tr class="transition-colors focus-within:bg-surface-50 dark:focus-within:bg-surface-800/30">
					<td class="px-3 py-1.5"></td>
					<td class="px-4 py-1.5 text-xs text-surface-400">+</td>
					<td class="px-4 py-1.5"></td>
					<td class="px-4 py-1.5"></td>
					<td colspan="3" class="px-4 py-1.5">
						<InlineQuickAdd projectId={data.project.id} placeholder="Add task... (Enter to create)" class="text-surface-900 dark:text-surface-200" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>

<BulkActions
	{selectedIds}
	projectId={data.project.id}
	statuses={data.statuses}
	members={data.members}
	onclear={() => (selectedIds = [])}
/>

{#snippet taskRow(task: EnrichedTask, i: number)}
	<tr class="border-b border-surface-200 transition-colors hover:bg-surface-100 dark:border-surface-800/50 dark:hover:bg-surface-800/30 {selectedIds.includes(task.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''} {focusedIndex === i ? 'ring-1 ring-inset ring-brand-500/40' : ''}">
		<td class="px-3 py-2">
			<input
				type="checkbox"
				checked={selectedIds.includes(task.id)}
				onchange={() => toggleOne(task.id)}
				class="h-3.5 w-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-700"
			/>
		</td>
		<td class="px-4 py-2 text-xs text-surface-500">{task.number}</td>
		<td class="px-4 py-2">
			{#if task.type && task.type !== 'task'}
				<TaskTypeIcon type={task.type} />
			{/if}
		</td>
		<td class="px-4 py-2"><PriorityIcon priority={task.priority} /></td>
		<td class="px-4 py-2">
			<a
				href="/projects/{data.project.slug}/task/{task.number}"
				class="text-sm text-surface-900 hover:text-brand-600 dark:text-surface-200 dark:hover:text-white"
			>
				{task.title}
			</a>
		</td>
		<td class="px-4 py-2">
			{#if statusMap.get(task.statusId)}
				{@const status = statusMap.get(task.statusId)!}
				<span class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
					<span class="h-2 w-2 rounded-full" style="background-color: {status.color}"></span>
					{status.name}
				</span>
			{/if}
		</td>
		<td class="px-4 py-2">
			<div class="flex flex-wrap gap-1">
				{#each task.labels as label}
					<Badge color={label.color}>{label.name}</Badge>
				{/each}
			</div>
		</td>
	</tr>
{/snippet}
