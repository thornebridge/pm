<script lang="ts">
	interface Attachment {
		id: string;
		originalName: string;
		mimeType: string;
	}

	interface Props {
		attachment: Attachment;
		open: boolean;
		onclose: () => void;
	}

	let { attachment, open, onclose }: Props = $props();

	let imageUrl = $derived(`/api/attachments/${attachment.id}`);

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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 dark:bg-black/80"
		onkeydown={handleKeydown}
		onclick={handleBackdrop}
	>
		<div class="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center">
			<!-- Close button -->
			<button
				onclick={onclose}
				class="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 text-surface-100 shadow-lg transition hover:bg-surface-700 dark:bg-surface-700 dark:hover:bg-surface-600"
				title="Close"
			>
				<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<!-- Image -->
			<img
				src={imageUrl}
				alt={attachment.originalName}
				class="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
			/>

			<!-- Filename caption -->
			<div class="mt-3 rounded-md bg-surface-800/80 px-3 py-1.5 dark:bg-surface-900/80">
				<p class="text-sm text-surface-100">{attachment.originalName}</p>
			</div>
		</div>
	</div>
{/if}
