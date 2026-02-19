<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		actionHref?: string;
		actionLabel?: string;
		compact?: boolean;
		children?: Snippet;
	}

	let { icon, title, description, actionHref, actionLabel, compact = false, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center {compact ? 'py-6' : 'py-12'} text-center">
	{#if icon}
		<span class="mb-2 text-2xl text-surface-300 dark:text-surface-600">{icon}</span>
	{/if}
	<p class="text-sm font-medium text-surface-600 dark:text-surface-400">{title}</p>
	{#if description}
		<p class="mt-1 max-w-xs text-xs text-surface-500">{description}</p>
	{/if}
	{#if actionHref && actionLabel}
		<a
			href={actionHref}
			class="mt-3 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
		>{actionLabel}</a>
	{/if}
	{#if children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
