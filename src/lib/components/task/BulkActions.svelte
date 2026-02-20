<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	interface Status {
		id: string;
		name: string;
	}

	interface Member {
		id: string;
		name: string;
	}

	interface Props {
		selectedIds: string[];
		projectId: string;
		statuses: Status[];
		members?: Member[];
		onclear: () => void;
	}

	let { selectedIds, projectId, statuses, members = [], onclear }: Props = $props();

	async function bulkUpdate(updates: Record<string, unknown>) {
		try {
			await api(`/api/projects/${projectId}/tasks/bulk`, {
				method: 'PATCH',
				body: JSON.stringify({ taskIds: selectedIds, updates })
			});
			await invalidateAll();
			onclear();
		} catch {
			showToast('Bulk update failed', 'error');
		}
	}

	async function bulkDelete() {
		if (!confirm(`Delete ${selectedIds.length} task${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
		try {
			await api(`/api/projects/${projectId}/tasks/bulk`, {
				method: 'DELETE',
				body: JSON.stringify({ taskIds: selectedIds })
			});
			await invalidateAll();
			onclear();
		} catch {
			showToast('Bulk delete failed', 'error');
		}
	}
</script>

{#if selectedIds.length > 0}
	<div class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 px-4 py-2 shadow-xl dark:border-surface-700 dark:bg-surface-900">
		<span class="text-xs font-medium text-surface-700 dark:text-surface-300">{selectedIds.length} selected</span>

		<select
			onchange={(e) => { if (e.currentTarget.value) bulkUpdate({ statusId: e.currentTarget.value }); e.currentTarget.value = ''; }}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
		>
			<option value="">Status...</option>
			{#each statuses as status}
				<option value={status.id}>{status.name}</option>
			{/each}
		</select>

		<select
			onchange={(e) => { if (e.currentTarget.value) bulkUpdate({ priority: e.currentTarget.value }); e.currentTarget.value = ''; }}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
		>
			<option value="">Priority...</option>
			<option value="urgent">Urgent</option>
			<option value="high">High</option>
			<option value="medium">Medium</option>
			<option value="low">Low</option>
		</select>

		{#if members.length > 0}
			<select
				onchange={(e) => { bulkUpdate({ assigneeId: e.currentTarget.value || null }); e.currentTarget.value = ''; }}
				class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
			>
				<option value="">Assignee...</option>
				<option value="">Unassigned</option>
				{#each members as member}
					<option value={member.id}>{member.name}</option>
				{/each}
			</select>
		{/if}

		<button
			onclick={bulkDelete}
			class="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
			title="Delete selected tasks"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
			</svg>
			Delete
		</button>

		<button
			onclick={onclear}
			class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
		>
			Clear
		</button>
	</div>
{/if}
