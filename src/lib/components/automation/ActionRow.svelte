<script lang="ts">
	interface Props {
		action: Record<string, unknown>;
		statuses: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		labels: Array<{ id: string; name: string }>;
		onchange: (a: Record<string, unknown>) => void;
		onremove: () => void;
	}

	let { action, statuses, members, labels, onchange, onremove }: Props = $props();

	const actionTypes = [
		{ value: 'set_field', label: 'Set field' },
		{ value: 'add_label', label: 'Add label' },
		{ value: 'remove_label', label: 'Remove label' },
		{ value: 'add_comment', label: 'Add comment' },
		{ value: 'send_notification', label: 'Send notification' },
		{ value: 'fire_webhook', label: 'Fire webhook' }
	];

	const settableFields = [
		{ value: 'statusId', label: 'Status' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'assigneeId', label: 'Assignee' },
		{ value: 'type', label: 'Type' },
		{ value: 'sprintId', label: 'Sprint' }
	];

	const priorities = ['urgent', 'high', 'medium', 'low'];
	const types = ['task', 'bug', 'feature', 'improvement'];
	const notifyTargets = [
		{ value: 'assignee', label: 'Assignee' },
		{ value: 'creator', label: 'Task creator' }
	];

	function getFieldValueOptions(field: string) {
		switch (field) {
			case 'statusId': return statuses.map(s => ({ value: s.id, label: s.name }));
			case 'priority': return priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));
			case 'assigneeId': return members.map(m => ({ value: m.id, label: m.name }));
			case 'type': return types.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
			default: return [];
		}
	}

	const selectClass = 'rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
	const inputClass = selectClass;
</script>

<div class="space-y-2 rounded-md border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
	<div class="flex items-center justify-between gap-2">
		<select
			class="{selectClass} flex-1"
			value={action.type}
			onchange={(e) => onchange({ type: e.currentTarget.value })}
		>
			{#each actionTypes as at}
				<option value={at.value}>{at.label}</option>
			{/each}
		</select>
		<button
			onclick={onremove}
			class="text-surface-400 hover:text-red-500 dark:text-surface-500 dark:hover:text-red-400"
		>&times;</button>
	</div>

	{#if action.type === 'set_field'}
		<div class="flex items-center gap-2">
			<select
				class={selectClass}
				value={action.field ?? 'statusId'}
				onchange={(e) => onchange({ ...action, field: e.currentTarget.value, value: '' })}
			>
				{#each settableFields as f}
					<option value={f.value}>{f.label}</option>
				{/each}
			</select>
			<span class="text-xs text-surface-500">to</span>
			{#if getFieldValueOptions(String(action.field ?? 'statusId')).length > 0}
				<select
					class="{selectClass} min-w-[120px]"
					value={action.value ?? ''}
					onchange={(e) => onchange({ ...action, value: e.currentTarget.value })}
				>
					<option value="">Select...</option>
					{#each getFieldValueOptions(String(action.field ?? 'statusId')) as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			{:else}
				<input
					class="{inputClass} min-w-[120px]"
					value={action.value ?? ''}
					oninput={(e) => onchange({ ...action, value: e.currentTarget.value })}
					placeholder="Value..."
				/>
			{/if}
		</div>
	{:else if action.type === 'add_label' || action.type === 'remove_label'}
		<select
			class="{selectClass} w-full"
			value={action.labelId ?? ''}
			onchange={(e) => onchange({ ...action, labelId: e.currentTarget.value })}
		>
			<option value="">Select label...</option>
			{#each labels as l}
				<option value={l.id}>{l.name}</option>
			{/each}
		</select>
	{:else if action.type === 'add_comment'}
		<textarea
			class="{inputClass} w-full"
			rows="2"
			value={String(action.body ?? '')}
			oninput={(e) => onchange({ ...action, body: e.currentTarget.value })}
			placeholder="Comment body... Use {'{{'}task.title{'}}'}  templates"
		></textarea>
	{:else if action.type === 'send_notification'}
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<span class="text-xs text-surface-500 dark:text-surface-400">to:</span>
				<select
					class={selectClass}
					value={action.target ?? 'assignee'}
					onchange={(e) => onchange({ ...action, target: e.currentTarget.value })}
				>
					{#each notifyTargets as t}
						<option value={t.value}>{t.label}</option>
					{/each}
					{#each members as m}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</div>
			<input
				class="{inputClass} w-full"
				value={action.title ?? ''}
				oninput={(e) => onchange({ ...action, title: e.currentTarget.value })}
				placeholder="Notification title..."
			/>
			<input
				class="{inputClass} w-full"
				value={action.body ?? ''}
				oninput={(e) => onchange({ ...action, body: e.currentTarget.value })}
				placeholder="Notification body..."
			/>
		</div>
	{:else if action.type === 'fire_webhook'}
		<div class="space-y-2">
			<input
				class="{inputClass} w-full"
				value={action.url ?? ''}
				oninput={(e) => onchange({ ...action, url: e.currentTarget.value })}
				placeholder="https://..."
			/>
			<input
				class="{inputClass} w-full"
				value={action.secret ?? ''}
				oninput={(e) => onchange({ ...action, secret: e.currentTarget.value })}
				placeholder="HMAC secret (optional)"
			/>
		</div>
	{/if}
</div>
