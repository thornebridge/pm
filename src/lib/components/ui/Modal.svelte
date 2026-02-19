<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		title?: string;
		children: Snippet;
	}

	let { open, onclose, title, children }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onkeydown={handleKeydown}
		onclick={handleBackdrop}
	>
		<div class="absolute inset-0 bg-black/40 dark:bg-black/60" transition:fade={{ duration: 150 }}></div>
		<div
			class="relative w-full max-w-lg rounded-lg border border-surface-300 bg-surface-50 shadow-xl dark:border-surface-700 dark:bg-surface-900"
			role="dialog"
			aria-modal="true"
			transition:scale={{ start: 0.95, duration: 150 }}
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-surface-300 px-4 py-3 dark:border-surface-800">
					<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
					<button onclick={onclose} class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">&times;</button>
				</div>
			{/if}
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
