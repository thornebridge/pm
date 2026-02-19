<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: string;
		estimatePoints: number | null;
		labels?: Array<{ name: string; color: string }>;
	}

	interface Props {
		backlogTasks: Task[];
		sprintId: string;
		projectId: string;
		projectSlug: string;
	}

	let { backlogTasks, sprintId, projectId, projectSlug }: Props = $props();

	async function addToSprint(taskId: string) {
		try {
			await api(`/api/projects/${projectId}/tasks/${taskId}`, {
				method: 'PATCH',
				body: JSON.stringify({ sprintId })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to add task to sprint', 'error');
		}
	}
</script>

<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
	<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">Backlog</h3>

	{#if backlogTasks.length === 0}
		<p class="text-sm text-surface-500">No unplanned tasks.</p>
	{:else}
		<div class="max-h-64 space-y-1 overflow-y-auto">
			{#each backlogTasks as task (task.id)}
				<div class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-200 dark:hover:bg-surface-800">
					<PriorityIcon priority={task.priority} />
					<a href="/projects/{projectSlug}/task/{task.number}" class="flex-1 truncate text-sm text-surface-900 hover:text-brand-600 dark:text-surface-200">
						<span class="text-surface-500">#{task.number}</span> {task.title}
					</a>
					{#if task.estimatePoints}
						<span class="text-xs text-surface-500">{task.estimatePoints}pt</span>
					{/if}
					<button
						onclick={() => addToSprint(task.id)}
						class="rounded px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-900"
					>
						Add
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
