<script lang="ts">
	import ConditionRow from './ConditionRow.svelte';

	interface Condition {
		field: string;
		operator: string;
		value?: string | string[];
	}

	interface Props {
		conditions: Condition[];
		statuses: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		labels: Array<{ id: string; name: string }>;
		onchange: (conditions: Condition[]) => void;
	}

	let { conditions, statuses, members, labels, onchange }: Props = $props();

	function addCondition() {
		onchange([...conditions, { field: 'statusId', operator: 'equals', value: '' }]);
	}

	function updateCondition(index: number, c: Condition) {
		const next = [...conditions];
		next[index] = c;
		onchange(next);
	}

	function removeCondition(index: number) {
		onchange(conditions.filter((_, i) => i !== index));
	}
</script>

<div class="space-y-2">
	{#each conditions as condition, i}
		{#if i > 0}
			<div class="text-xs font-medium text-surface-400 dark:text-surface-500 pl-1">AND</div>
		{/if}
		<ConditionRow
			{condition}
			{statuses}
			{members}
			{labels}
			onchange={(c) => updateCondition(i, c)}
			onremove={() => removeCondition(i)}
		/>
	{/each}

	<button
		onclick={addCondition}
		class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
	>
		+ Add condition
	</button>
</div>
