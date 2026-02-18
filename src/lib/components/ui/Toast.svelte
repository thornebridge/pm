<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/toasts.js';
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg {toast.type === 'error' ? 'border-red-800 bg-red-950 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-200'}"
		>
			<div class="flex items-center gap-2">
				<span>{toast.message}</span>
				<button onclick={() => dismissToast(toast.id)} class="text-slate-500 hover:text-slate-300">&times;</button>
			</div>
		</div>
	{/each}
</div>
