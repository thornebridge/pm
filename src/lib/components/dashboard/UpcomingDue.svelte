<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: 'urgent' | 'high' | 'medium' | 'low';
		dueDate: number | null;
		projectSlug: string;
		projectName: string;
	}

	interface Props {
		tasks: Task[];
	}

	let { tasks }: Props = $props();

	function formatDue(ts: number | null): string {
		if (!ts) return '';
		const now = new Date();
		const due = new Date(ts);
		const diffDays = Math.ceil((ts - now.getTime()) / 86400000);
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Tomorrow';
		return due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

{#if tasks.length > 0}
	<section>
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Due This Week</h2>
		<div class="space-y-1">
			{#each tasks as task (task.id)}
				<a
					href="/projects/{task.projectSlug}/task/{task.number}"
					class="flex items-center gap-2 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 transition hover:border-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
				>
					<PriorityIcon priority={task.priority} />
					<span class="min-w-0 flex-1 truncate text-sm text-surface-900 dark:text-surface-200">{task.title}</span>
					<span class="shrink-0 text-[10px] text-surface-400">{task.projectName}</span>
					<span class="shrink-0 text-xs text-surface-500">{formatDue(task.dueDate)}</span>
				</a>
			{/each}
		</div>
	</section>
{/if}
