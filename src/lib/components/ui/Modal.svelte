<script lang="ts">
	import type { Snippet } from 'svelte';

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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
		onkeydown={handleKeydown}
		onclick={handleBackdrop}
	>
		<div
			class="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
			role="dialog"
			aria-modal="true"
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
					<h2 class="text-sm font-semibold text-slate-100">{title}</h2>
					<button onclick={onclose} class="text-slate-500 hover:text-slate-300">&times;</button>
				</div>
			{/if}
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
