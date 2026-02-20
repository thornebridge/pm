<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import CrmTaskForm from '$lib/components/crm/CrmTaskForm.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let quickFilter = $state<'my' | 'all' | 'overdue' | 'completed'>('my');

	const now = Date.now();

	const filtered = $derived.by(() => {
		let list = data.tasks;
		switch (quickFilter) {
			case 'my':
				return list.filter((t) => t.assigneeId === data.currentUserId && !t.completedAt);
			case 'all':
				return list.filter((t) => !t.completedAt);
			case 'overdue':
				return list.filter((t) => !t.completedAt && t.dueDate && t.dueDate < now);
			case 'completed':
				return list.filter((t) => t.completedAt);
			default:
				return list;
		}
	});

	async function toggleComplete(taskId: string, currentlyCompleted: boolean) {
		try {
			await api(`/api/crm/tasks/${taskId}`, {
				method: 'PATCH',
				body: JSON.stringify({ completed: !currentlyCompleted })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update task', 'error');
		}
	}

	function dueDateClass(dueDate: number | null, completedAt: number | null) {
		if (completedAt || !dueDate) return '';
		const diff = dueDate - now;
		if (diff < 0) return 'text-red-500';
		if (diff < 86400000) return 'text-amber-500';
		return '';
	}

	function priorityIcon(p: string) {
		switch (p) {
			case 'urgent': return '\u{1F534}';
			case 'high': return '\u{1F7E0}';
			case 'medium': return '\u{1F7E1}';
			case 'low': return '\u{1F535}';
			default: return '';
		}
	}
</script>

<svelte:head>
	<title>Sales Tasks</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Sales Tasks</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Add Task
		</button>
	</div>

	<!-- Quick filters -->
	<div class="mb-4 flex gap-2">
		{#each [
			{ key: 'my', label: 'My Tasks' },
			{ key: 'all', label: 'All Open' },
			{ key: 'overdue', label: 'Overdue' },
			{ key: 'completed', label: 'Completed' }
		] as f}
			<button
				onclick={() => (quickFilter = f.key as typeof quickFilter)}
				class="rounded-md px-3 py-1.5 text-sm transition {quickFilter === f.key ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
			>
				{f.label}
			</button>
		{/each}
	</div>

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">No tasks match this filter.</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="w-8 px-4 py-2"></th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Title</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Priority</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Due Date</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Opportunity</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Assignee</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as task (task.id)}
						<tr class="border-b border-surface-200 dark:border-surface-800 {task.completedAt ? 'opacity-60' : ''}">
							<td class="px-4 py-2.5">
								<input
									type="checkbox"
									checked={!!task.completedAt}
									onchange={() => toggleComplete(task.id, !!task.completedAt)}
									class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
								/>
							</td>
							<td class="px-4 py-2.5 font-medium {task.completedAt ? 'line-through text-surface-500' : 'text-surface-900 dark:text-surface-100'}">
								{task.title}
							</td>
							<td class="px-4 py-2.5 text-center">{priorityIcon(task.priority)}</td>
							<td class="px-4 py-2.5 {dueDateClass(task.dueDate, task.completedAt)}">
								{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{task.companyName || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{task.opportunityTitle || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{task.assigneeName || '\u2014'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<CrmTaskForm
	open={showForm}
	onclose={() => (showForm = false)}
	companies={data.crmCompanies}
	members={data.members}
/>
