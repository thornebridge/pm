<script lang="ts">
	interface Sprint {
		id: string;
		name: string;
		goal: string | null;
		startDate: number | null;
		endDate: number | null;
		status: string;
		total: number;
		done: number;
		totalPoints: number;
		donePoints: number;
	}

	interface Props {
		sprint: Sprint;
		projectSlug: string;
	}

	let { sprint, projectSlug }: Props = $props();

	const progress = $derived(sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0);

	function formatDate(ts: number | null) {
		if (!ts) return '—';
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<a
	href="/projects/{projectSlug}/sprints/{sprint.id}"
	class="block rounded-lg border border-surface-300 bg-surface-50 p-4 transition hover:border-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100">{sprint.name}</h3>
			<span class="rounded-full px-2 py-0.5 text-[10px] font-medium {
				sprint.status === 'active' ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300' :
				sprint.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
				sprint.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
				'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
			}">
				{sprint.status}
			</span>
		</div>
		<span class="text-xs text-surface-500">{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</span>
	</div>

	{#if sprint.goal}
		<p class="mt-1 text-xs text-surface-500 line-clamp-1">{sprint.goal}</p>
	{/if}

	<div class="mt-3">
		<div class="flex items-center justify-between text-xs text-surface-500">
			<span>{sprint.done}/{sprint.total} tasks</span>
			<span>{progress}%</span>
		</div>
		<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
			<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {progress}%"></div>
		</div>
	</div>
</a>
