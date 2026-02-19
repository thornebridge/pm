<script lang="ts">
	interface Automation {
		id: string;
		name: string;
		description: string | null;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: unknown;
		actions: Array<{ type: string; [key: string]: unknown }>;
		enabled: boolean;
		runCount: number;
		lastRun: number | null;
		errorCount: number;
	}

	interface Props {
		automation: Automation;
		ontoggle: (id: string, enabled: boolean) => void;
		onedit: (automation: Automation) => void;
		ondelete: (id: string) => void;
		onviewlog: (id: string) => void;
	}

	let { automation, ontoggle, onedit, ondelete, onviewlog }: Props = $props();

	const triggerLabels: Record<string, string> = {
		'task.created': 'Task created',
		'task.deleted': 'Task deleted',
		'task.status_changed': 'Status changed',
		'task.priority_changed': 'Priority changed',
		'task.assigned': 'Assignee changed',
		'task.due_date_changed': 'Due date changed',
		'task.type_changed': 'Type changed',
		'comment.added': 'Comment added',
		'label.added': 'Label added',
		'label.removed': 'Label removed',
		'due_date.approaching': 'Due date approaching',
		'checklist.completed': 'Checklist completed'
	};

	const actionLabels: Record<string, string> = {
		set_field: 'Set field',
		add_label: 'Add label',
		remove_label: 'Remove label',
		add_comment: 'Add comment',
		send_notification: 'Notify',
		fire_webhook: 'Webhook'
	};

	function formatTime(ts: number): string {
		const d = new Date(ts);
		const now = Date.now();
		const diff = now - ts;
		if (diff < 60_000) return 'just now';
		if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
		if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
		return d.toLocaleDateString();
	}
</script>

<div class="group rounded-lg border border-surface-200 bg-white p-4 transition hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800/50 dark:hover:border-surface-600 {!automation.enabled ? 'opacity-60' : ''}">
	<div class="flex items-start justify-between gap-3">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{automation.name}</h3>
				{#if automation.errorCount > 0}
					<span class="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">{automation.errorCount} errors</span>
				{/if}
			</div>
			{#if automation.description}
				<p class="mt-0.5 text-xs text-surface-500 dark:text-surface-400 truncate">{automation.description}</p>
			{/if}
		</div>

		<!-- Toggle -->
		<button
			onclick={() => ontoggle(automation.id, !automation.enabled)}
			class="relative inline-flex h-5 w-9 items-center rounded-full transition {automation.enabled ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-600'}"
			title={automation.enabled ? 'Disable' : 'Enable'}
		>
			<span class="inline-block h-3.5 w-3.5 rounded-full bg-white transition {automation.enabled ? 'translate-x-4' : 'translate-x-0.5'}"></span>
		</button>
	</div>

	<!-- Summary -->
	<div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
		<span class="rounded bg-brand-100 px-1.5 py-0.5 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
			{triggerLabels[automation.trigger.event] || automation.trigger.event}
		</span>
		<span class="text-surface-400">&rarr;</span>
		{#each automation.actions as action}
			<span class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
				{actionLabels[action.type] || action.type}
			</span>
		{/each}
	</div>

	<!-- Stats & Actions -->
	<div class="mt-3 flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
		<div class="flex items-center gap-3">
			<span>{automation.runCount} runs</span>
			{#if automation.lastRun}
				<span>Last: {formatTime(automation.lastRun)}</span>
			{/if}
		</div>
		<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
			<button
				onclick={() => onviewlog(automation.id)}
				class="rounded px-1.5 py-0.5 hover:bg-surface-200 dark:hover:bg-surface-700"
			>Log</button>
			<button
				onclick={() => onedit(automation)}
				class="rounded px-1.5 py-0.5 hover:bg-surface-200 dark:hover:bg-surface-700"
			>Edit</button>
			<button
				onclick={() => ondelete(automation.id)}
				class="rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
			>Delete</button>
		</div>
	</div>
</div>
