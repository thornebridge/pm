<script lang="ts">
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import SprintPlanner from '$lib/components/sprint/SprintPlanner.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let showPlanner = $state(false);

	const totalPoints = $derived(data.tasks.reduce((sum, t) => sum + (t.estimatePoints || 0), 0));
	const completedTasks = $derived(data.tasks.filter((t) => {
		const status = data.statuses.find((s) => s.id === t.statusId);
		return status?.isClosed;
	}).length);

	async function updateStatus(status: string) {
		try {
			await api(`/api/projects/${data.project.id}/sprints/${data.sprint.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update sprint', 'error');
		}
	}

	function formatDate(ts: number | null) {
		if (!ts) return '—';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>{data.sprint.name} - {data.project.name}</title>
</svelte:head>

<div class="p-6">
	<!-- Sprint header -->
	<div class="mb-6">
		<div class="flex items-center gap-3">
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">{data.sprint.name}</h1>
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {
				data.sprint.status === 'active' ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300' :
				data.sprint.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
				data.sprint.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
				'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-300'
			}">
				{data.sprint.status}
			</span>
		</div>
		{#if data.sprint.goal}
			<p class="mt-1 text-sm text-surface-600 dark:text-surface-400">{data.sprint.goal}</p>
		{/if}
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-surface-500">
			<span>{formatDate(data.sprint.startDate)} — {formatDate(data.sprint.endDate)}</span>
			<span>{data.tasks.length} tasks ({completedTasks} done)</span>
			{#if totalPoints > 0}
				<span>{totalPoints} points</span>
			{/if}
		</div>

		<!-- Sprint actions -->
		<div class="mt-3 flex gap-2">
			{#if data.sprint.status === 'planning'}
				<button onclick={() => updateStatus('active')} class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500">
					Start Sprint
				</button>
			{:else if data.sprint.status === 'active'}
				<button onclick={() => updateStatus('completed')} class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500">
					Complete Sprint
				</button>
			{/if}
			<button onclick={() => (showPlanner = !showPlanner)} class="rounded-md border border-surface-300 bg-surface-50 px-2.5 py-1 text-xs font-medium text-surface-700 hover:bg-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700">
				{showPlanner ? 'Hide Planner' : 'Plan Sprint'}
			</button>
		</div>
	</div>

	<!-- Sprint planner (backlog to sprint) -->
	{#if showPlanner}
		<div class="mb-6">
			<SprintPlanner
				backlogTasks={data.backlogTasks}
				sprintId={data.sprint.id}
				projectId={data.project.id}
				projectSlug={data.project.slug}
			/>
		</div>
	{/if}

	<!-- Sprint Kanban -->
	<KanbanBoard
		statuses={data.statuses}
		tasks={data.tasks}
		projectId={data.project.id}
		projectSlug={data.project.slug}
	/>
</div>
