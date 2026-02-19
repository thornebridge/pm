<script lang="ts">
	import { showToast } from '$lib/stores/toasts.js';

	interface Props {
		taskId: string;
		projectId: string;
		onuploaded?: (attachment: Record<string, unknown>) => void;
	}

	let { taskId, projectId, onuploaded }: Props = $props();

	let dragging = $state(false);
	let uploading = $state(false);
	let progress = $state(0);
	let fileInput: HTMLInputElement | undefined = $state();

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			uploadFile(files[0]);
		}
	}

	function handleClick() {
		fileInput?.click();
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			uploadFile(input.files[0]);
			input.value = '';
		}
	}

	async function uploadFile(file: File) {
		const maxSize = 25 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('File exceeds 25 MB limit', 'error');
			return;
		}

		uploading = true;
		progress = 0;

		const formData = new FormData();
		formData.append('file', file);

		try {
			const xhr = new XMLHttpRequest();

			const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) {
						progress = Math.round((e.loaded / e.total) * 100);
					}
				});

				xhr.addEventListener('load', () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(JSON.parse(xhr.responseText));
					} else {
						const body = JSON.parse(xhr.responseText).error || 'Upload failed';
						reject(new Error(body));
					}
				});

				xhr.addEventListener('error', () => reject(new Error('Upload failed')));
				xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

				xhr.open('POST', `/api/projects/${projectId}/tasks/${taskId}/attachments`);
				xhr.send(formData);
			});

			showToast('File uploaded', 'info');
			onuploaded?.(result);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
		} finally {
			uploading = false;
			progress = 0;
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	class="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition
		{dragging
		? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20'
		: 'border-surface-300 bg-surface-50 hover:border-surface-400 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600'}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={handleClick}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
>
	<input
		bind:this={fileInput}
		type="file"
		class="hidden"
		onchange={handleFileChange}
	/>

	{#if uploading}
		<div class="flex w-full flex-col items-center gap-2">
			<svg class="h-6 w-6 animate-spin text-brand-500 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<div class="w-full max-w-48">
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
					<div
						class="h-full rounded-full bg-brand-500 transition-all duration-200 dark:bg-brand-400"
						style="width: {progress}%"
					></div>
				</div>
				<p class="mt-1 text-center text-xs text-surface-500 dark:text-surface-400">{progress}%</p>
			</div>
		</div>
	{:else}
		<svg class="mb-2 h-8 w-8 text-surface-400 dark:text-surface-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
		</svg>
		<p class="text-sm text-surface-600 dark:text-surface-300">
			Drop a file here or <span class="font-medium text-brand-600 dark:text-brand-400">browse</span>
		</p>
		<p class="mt-1 text-xs text-surface-400 dark:text-surface-500">Max 25 MB</p>
	{/if}
</div>
