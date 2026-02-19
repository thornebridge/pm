<script lang="ts">
	interface Activity {
		id: string;
		action: string;
		detail: string | null;
		createdAt: number;
		taskTitle: string;
		taskNumber: number;
		projectSlug: string;
		projectName: string;
		userName: string;
	}

	interface Props {
		activity: Activity[];
	}

	let { activity }: Props = $props();

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			created: 'created',
			status_changed: 'moved',
			assigned: 'assigned',
			priority_changed: 'reprioritized',
			commented: 'commented on',
			label_added: 'labeled',
			label_removed: 'unlabeled',
			edited: 'edited'
		};
		return labels[action] || action;
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<section>
	<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Recent Activity</h2>

	{#if activity.length === 0}
		<p class="rounded-lg border border-surface-300 bg-surface-50 p-4 text-sm text-surface-500 dark:border-surface-800 dark:bg-surface-900">
			No recent activity.
		</p>
	{:else}
		<div class="space-y-2">
			{#each activity as item (item.id)}
				<div class="rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 dark:border-surface-800 dark:bg-surface-900">
					<div class="text-xs text-surface-500">
						<span class="font-medium text-surface-700 dark:text-surface-300">{item.userName}</span>
						{actionLabel(item.action)}
						<a href="/projects/{item.projectSlug}/task/{item.taskNumber}" class="font-medium text-surface-700 hover:text-brand-600 dark:text-surface-300">
							#{item.taskNumber} {item.taskTitle}
						</a>
					</div>
					<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-400">
						<span>{item.projectName}</span>
						<span>{timeAgo(item.createdAt)}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
