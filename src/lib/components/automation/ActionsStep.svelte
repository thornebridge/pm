<script lang="ts">
	import ActionRow from './ActionRow.svelte';

	interface Props {
		actions: Record<string, unknown>[];
		statuses: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		labels: Array<{ id: string; name: string }>;
		onchange: (actions: Record<string, unknown>[]) => void;
	}

	let { actions, statuses, members, labels, onchange }: Props = $props();

	function addAction() {
		onchange([...actions, { type: 'set_field', field: 'statusId', value: '' }]);
	}

	function updateAction(index: number, a: Record<string, unknown>) {
		const next = [...actions];
		next[index] = a;
		onchange(next);
	}

	function removeAction(index: number) {
		onchange(actions.filter((_, i) => i !== index));
	}
</script>

<div class="space-y-2">
	{#each actions as action, i}
		<ActionRow
			{action}
			{statuses}
			{members}
			{labels}
			onchange={(a) => updateAction(i, a)}
			onremove={() => removeAction(i)}
		/>
	{/each}

	<button
		onclick={addAction}
		class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
	>
		+ Add action
	</button>
</div>
