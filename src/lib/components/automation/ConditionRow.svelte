<script lang="ts">
	interface Props {
		condition: { field: string; operator: string; value?: string | string[] };
		statuses: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		labels: Array<{ id: string; name: string }>;
		onchange: (c: { field: string; operator: string; value?: string | string[] }) => void;
		onremove: () => void;
	}

	let { condition, statuses, members, labels, onchange, onremove }: Props = $props();

	const fields = [
		{ value: 'statusId', label: 'Status' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'assigneeId', label: 'Assignee' },
		{ value: 'type', label: 'Type' },
		{ value: 'labelIds', label: 'Labels' },
		{ value: 'sprintId', label: 'Sprint' }
	];

	const operators = [
		{ value: 'equals', label: 'equals' },
		{ value: 'not_equals', label: 'does not equal' },
		{ value: 'contains', label: 'contains' },
		{ value: 'not_contains', label: 'does not contain' },
		{ value: 'is_set', label: 'is set' },
		{ value: 'is_not_set', label: 'is not set' }
	];

	const priorities = ['urgent', 'high', 'medium', 'low'];
	const types = ['task', 'bug', 'feature', 'improvement'];

	const needsValue = $derived(!['is_set', 'is_not_set'].includes(condition.operator));

	function getValueOptions(field: string) {
		switch (field) {
			case 'statusId': return statuses.map(s => ({ value: s.id, label: s.name }));
			case 'priority': return priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));
			case 'assigneeId': return members.map(m => ({ value: m.id, label: m.name }));
			case 'type': return types.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
			case 'labelIds': return labels.map(l => ({ value: l.id, label: l.name }));
			default: return [];
		}
	}

	const selectClass = 'rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';
</script>

<div class="flex items-center gap-2">
	<select
		class={selectClass}
		value={condition.field}
		onchange={(e) => onchange({ ...condition, field: e.currentTarget.value, value: undefined })}
	>
		{#each fields as f}
			<option value={f.value}>{f.label}</option>
		{/each}
	</select>

	<select
		class={selectClass}
		value={condition.operator}
		onchange={(e) => onchange({ ...condition, operator: e.currentTarget.value })}
	>
		{#each operators as op}
			<option value={op.value}>{op.label}</option>
		{/each}
	</select>

	{#if needsValue}
		{@const options = getValueOptions(condition.field)}
		{#if options.length > 0}
			<select
				class="{selectClass} min-w-[120px]"
				value={typeof condition.value === 'string' ? condition.value : ''}
				onchange={(e) => onchange({ ...condition, value: e.currentTarget.value })}
			>
				<option value="">Select...</option>
				{#each options as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		{:else}
			<input
				type="text"
				class="{selectClass} min-w-[120px]"
				value={typeof condition.value === 'string' ? condition.value : ''}
				oninput={(e) => onchange({ ...condition, value: e.currentTarget.value })}
				placeholder="Value..."
			/>
		{/if}
	{/if}

	<button
		onclick={onremove}
		class="text-surface-400 hover:text-red-500 dark:text-surface-500 dark:hover:text-red-400"
		title="Remove condition"
	>&times;</button>
</div>
