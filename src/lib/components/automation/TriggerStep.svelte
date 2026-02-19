<script lang="ts">
	interface Props {
		trigger: { event: string; config?: Record<string, unknown> };
		statuses: Array<{ id: string; name: string }>;
		onchange: (t: { event: string; config?: Record<string, unknown> }) => void;
	}

	let { trigger, statuses, onchange }: Props = $props();

	const triggers = [
		{ value: 'task.created', label: 'Task created' },
		{ value: 'task.deleted', label: 'Task deleted' },
		{ value: 'task.status_changed', label: 'Status changed' },
		{ value: 'task.priority_changed', label: 'Priority changed' },
		{ value: 'task.assigned', label: 'Assignee changed' },
		{ value: 'task.due_date_changed', label: 'Due date changed' },
		{ value: 'task.type_changed', label: 'Type changed' },
		{ value: 'comment.added', label: 'Comment added' },
		{ value: 'label.added', label: 'Label added' },
		{ value: 'label.removed', label: 'Label removed' },
		{ value: 'due_date.approaching', label: 'Due date approaching' },
		{ value: 'checklist.completed', label: 'Checklist completed' }
	];

	const priorities = ['urgent', 'high', 'medium', 'low'];

	const selectClass = 'rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
</script>

<div class="space-y-2">
	<select
		class="{selectClass} w-full"
		value={trigger.event}
		onchange={(e) => onchange({ event: e.currentTarget.value })}
	>
		{#each triggers as t}
			<option value={t.value}>{t.label}</option>
		{/each}
	</select>

	{#if trigger.event === 'task.status_changed'}
		<div class="flex items-center gap-2">
			<span class="text-xs text-surface-500 dark:text-surface-400">to status:</span>
			<select
				class={selectClass}
				value={trigger.config?.statusId ?? ''}
				onchange={(e) => onchange({ ...trigger, config: { ...trigger.config, statusId: e.currentTarget.value || undefined } })}
			>
				<option value="">Any status</option>
				{#each statuses as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if trigger.event === 'task.priority_changed'}
		<div class="flex items-center gap-2">
			<span class="text-xs text-surface-500 dark:text-surface-400">to priority:</span>
			<select
				class={selectClass}
				value={trigger.config?.priority ?? ''}
				onchange={(e) => onchange({ ...trigger, config: { ...trigger.config, priority: e.currentTarget.value || undefined } })}
			>
				<option value="">Any priority</option>
				{#each priorities as p}
					<option value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if trigger.event === 'due_date.approaching'}
		<div class="flex items-center gap-2">
			<span class="text-xs text-surface-500 dark:text-surface-400">hours before:</span>
			<input
				type="number"
				class="{selectClass} w-20"
				value={trigger.config?.hoursBefore ?? 24}
				min="1"
				oninput={(e) => onchange({ ...trigger, config: { ...trigger.config, hoursBefore: parseInt(e.currentTarget.value) || 24 } })}
			/>
		</div>
	{/if}
</div>
