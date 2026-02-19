<script lang="ts">
	import { showToast } from '$lib/stores/toasts.js';
	import { api } from '$lib/utils/api.js';

	interface Attachment {
		id: string;
		filename: string;
		originalName: string;
		mimeType: string;
		size: number;
		uploaderName?: string;
		createdAt: number;
	}

	interface Props {
		attachments: Attachment[];
		projectId: string;
		taskId: string;
		ondeleted?: (attachmentId: string) => void;
	}

	let { attachments, projectId, taskId, ondeleted }: Props = $props();

	let deletingId = $state<string | null>(null);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function fileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'image';
		if (mimeType.startsWith('video/')) return 'video';
		if (mimeType === 'application/pdf') return 'pdf';
		if (mimeType.startsWith('text/')) return 'text';
		return 'file';
	}

	async function handleDelete(attachment: Attachment) {
		if (deletingId) return;
		deletingId = attachment.id;

		try {
			await api(`/api/attachments/${attachment.id}`, { method: 'DELETE' });
			showToast('Attachment removed', 'info');
			ondeleted?.(attachment.id);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
		} finally {
			deletingId = null;
		}
	}
</script>

{#if attachments.length === 0}
	<p class="py-3 text-center text-sm text-surface-400 dark:text-surface-500">No attachments</p>
{:else}
	<ul class="divide-y divide-surface-200 dark:divide-surface-800">
		{#each attachments as attachment (attachment.id)}
			<li class="flex items-center gap-3 py-2.5">
				<!-- File type icon -->
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800">
					{#if fileIcon(attachment.mimeType) === 'image'}
						<svg class="h-5 w-5 text-brand-500 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
						</svg>
					{:else if fileIcon(attachment.mimeType) === 'pdf'}
						<svg class="h-5 w-5 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
					{:else}
						<svg class="h-5 w-5 text-surface-500 dark:text-surface-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
					{/if}
				</div>

				<!-- Name + size -->
				<div class="min-w-0 flex-1">
					<a
						href="/api/attachments/{attachment.id}"
						download={attachment.originalName}
						class="block truncate text-sm font-medium text-surface-800 hover:text-brand-600 dark:text-surface-200 dark:hover:text-brand-400"
						title={attachment.originalName}
					>
						{attachment.originalName}
					</a>
					<p class="text-xs text-surface-400 dark:text-surface-500">
						{formatSize(attachment.size)}
						{#if attachment.uploaderName}
							<span class="mx-1">--</span>{attachment.uploaderName}
						{/if}
					</p>
				</div>

				<!-- Actions -->
				<div class="flex shrink-0 items-center gap-1">
					<a
						href="/api/attachments/{attachment.id}"
						download={attachment.originalName}
						class="rounded p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
						title="Download"
					>
						<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
						</svg>
					</a>
					<button
						onclick={() => handleDelete(attachment)}
						disabled={deletingId === attachment.id}
						class="rounded p-1.5 text-surface-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-surface-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
						title="Delete"
					>
						{#if deletingId === attachment.id}
							<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						{:else}
							<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
							</svg>
						{/if}
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}
