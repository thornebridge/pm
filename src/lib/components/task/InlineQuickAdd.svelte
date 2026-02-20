<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		projectId: string;
		statusId?: string;
		sprintId?: string;
		placeholder?: string;
		class?: string;
	}

	let { projectId, statusId, sprintId, placeholder = 'New task...', class: className = '' }: Props = $props();

	let value = $state('');
	let submitting = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	async function submit() {
		const title = value.trim();
		if (!title || submitting) return;
		submitting = true;
		try {
			const body: Record<string, unknown> = { title };
			if (statusId) body.statusId = statusId;
			if (sprintId) body.sprintId = sprintId;
			await api(`/api/projects/${projectId}/tasks`, {
				method: 'POST',
				body: JSON.stringify(body)
			});
			value = '';
			await invalidateAll();
			// Refocus input for rapid entry
			inputEl?.focus();
		} catch {
			showToast('Failed to create task', 'error');
		} finally {
			submitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		} else if (e.key === 'Escape') {
			value = '';
			inputEl?.blur();
		}
	}
</script>

<input
	bind:this={inputEl}
	bind:value
	onkeydown={handleKeydown}
	{placeholder}
	disabled={submitting}
	class="w-full bg-transparent text-sm outline-none placeholder:text-surface-400 disabled:opacity-50 dark:placeholder:text-surface-600 {className}"
/>
