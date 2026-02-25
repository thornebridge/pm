<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto text-sm shadow-lg"
			style="border-radius: var(--pm-r-md); border-width: var(--pm-bw); border-style: solid; {toast.type === 'error' ? 'border-color: var(--color-error); background-color: color-mix(in srgb, var(--color-error) 10%, var(--color-surface-50)); color: var(--color-error);' : 'border-color: var(--color-surface-300); background-color: var(--color-surface-50); color: var(--color-surface-900);'} padding: var(--pm-d-pad-x) var(--pm-d-pad-x);"
			in:fly={{ y: 20, duration: 200 }}
			out:fade={{ duration: 100 }}
		>
			<div class="flex items-center gap-2">
				<span>{toast.message}</span>
				<button onclick={() => dismissToast(toast.id)} class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">&times;</button>
			</div>
		</div>
	{/each}
</div>
