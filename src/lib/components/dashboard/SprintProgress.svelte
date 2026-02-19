<script lang="ts">
	interface Sprint {
		id: string;
		name: string;
		projectName: string;
		projectSlug: string;
		totalTasks: number;
		completedTasks: number;
		endDate: number | null;
	}

	interface Props {
		sprints: Sprint[];
	}

	let { sprints }: Props = $props();

	function daysLeft(endDate: number | null): string {
		if (!endDate) return '';
		const days = Math.ceil((endDate - Date.now()) / 86400000);
		if (days < 0) return 'Overdue';
		if (days === 0) return 'Ends today';
		return `${days}d left`;
	}
</script>

{#if sprints.length > 0}
	<section>
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Active Sprints</h2>
		<div class="space-y-2">
			{#each sprints as sprint (sprint.id)}
				{@const pct = sprint.totalTasks ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100) : 0}
				<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
					<div class="mb-1 flex items-center justify-between">
						<a href="/projects/{sprint.projectSlug}/sprints/{sprint.id}" class="text-sm font-medium text-surface-900 hover:text-brand-600 dark:text-surface-200">{sprint.name}</a>
						<span class="text-xs text-surface-500">{sprint.projectName}</span>
					</div>
					<div class="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
						<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {pct}%"></div>
					</div>
					<div class="flex items-center justify-between text-[10px] text-surface-400">
						<span>{sprint.completedTasks}/{sprint.totalTasks} tasks ({pct}%)</span>
						<span>{daysLeft(sprint.endDate)}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}
