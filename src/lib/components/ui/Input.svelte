<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
	}

	let { label, id, class: className = '', ...rest }: Props = $props();
</script>

{#if label}
	<label for={id} class="mb-1 block text-sm text-slate-400">{label}</label>
{/if}
<input
	{id}
	class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 {className}"
	{...rest}
/>
