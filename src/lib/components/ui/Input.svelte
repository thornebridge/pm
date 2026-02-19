<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
	}

	let { label, id, class: className = '', ...rest }: Props = $props();
</script>

{#if label}
	<label for={id} class="mb-1 block text-sm text-surface-600 dark:text-surface-400">{label}</label>
{/if}
<input
	{id}
	class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-600 {className}"
	{...rest}
/>
