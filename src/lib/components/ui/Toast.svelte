<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/toasts.js';
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg {toast.type === 'error' ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300' : 'border-surface-300 bg-surface-50 text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100'}"
		>
			<div class="flex items-center gap-2">
				<span>{toast.message}</span>
				<button onclick={() => dismissToast(toast.id)} class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">&times;</button>
			</div>
		</div>
	{/each}
</div>
