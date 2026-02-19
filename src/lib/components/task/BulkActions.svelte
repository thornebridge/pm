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
			onclick={onclear}
			class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
		>
			Clear
		</button>
	</div>
{/if}
