<script lang="ts">
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import TaskDetailPanel from '$lib/components/task/TaskDetailPanel.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let showCreate = $state(false);
	let title = $state('');
	let description = $state('');
	let priority = $state<'urgent' | 'high' | 'medium' | 'low'>('medium');
	let assigneeId = $state('');
	let dueDate = $state('');
	let selectedLabelIds = $state<string[]>([]);
	let creating = $state(false);

	// Inline task detail panel
	let panelTask = $state<any>(null);
	let panelLoading = $state(false);

	async function openTaskPanel(task: { id: string; number: number }) {
		panelLoading = true;
		try {
			const detail = await api(`/api/projects/${data.project.id}/tasks/${task.id}`);
			panelTask = detail;
		} catch {
			showToast('Failed to load task', 'error');
		} finally {
			panelLoading = false;
		}
	}

	async function refreshPanel() {
		if (!panelTask) return;
		try {
			const detail = await api(`/api/projects/${data.project.id}/tasks/${panelTask.id}`);
			panelTask = detail;
			await invalidateAll();
		} catch {
			showToast('Failed to refresh task', 'error');
		}
	}

	async function createTask() {
		if (!title.trim()) return;
		creating = true;
		try {
			await api(`/api/projects/${data.project.id}/tasks`, {
				method: 'POST',
				body: JSON.stringify({
					title,
					description: description || undefined,
					priority,
					assigneeId: assigneeId || undefined,
					dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
					labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined
				})
			});
			resetForm();
			showCreate = false;
			await invalidateAll();
		} catch (err) {
			showToast('Failed to create task', 'error');
		} finally {
			creating = false;
		}
	}

	function resetForm() {
		title = '';
		description = '';
		priority = 'medium';
		assigneeId = '';
		dueDate = '';
		selectedLabelIds = [];
	}

	function toggleLabel(id: string) {
		if (selectedLabelIds.includes(id)) {
			selectedLabelIds = selectedLabelIds.filter((l) => l !== id);
		} else {
			selectedLabelIds = [...selectedLabelIds, id];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
			if (panelTask) return;
			e.preventDefault();
			showCreate = true;
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} - Board</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="pt-4">
	<div class="mb-4 flex items-center justify-between px-6">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Board</h2>
		<button
			onclick={() => (showCreate = true)}
			class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-500"
		>
			New task <kbd class="ml-1 rounded bg-brand-700 px-1 text-[10px]">C</kbd>
		</button>
	</div>

	<KanbanBoard
		statuses={data.statuses}
		tasks={data.tasks}
		projectId={data.project.id}
		projectSlug={data.project.slug}
		ontaskclick={(task) => openTaskPanel(task)}
	/>
</div>

<Modal open={showCreate} onclose={() => { showCreate = false; resetForm(); }} title="New task">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			createTask();
		}}
		class="space-y-3"
	>
		<input
			bind:value={title}
			placeholder="Task title"
			class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			autofocus
		/>

		<textarea
			bind:value={description}
			placeholder="Description (optional, markdown supported)"
			rows={3}
			class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		></textarea>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="create-priority" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Priority</label>
				<select
					id="create-priority"
					bind:value={priority}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				>
					<option value="urgent">Urgent</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>
			<div>
				<label for="create-assignee" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Assignee</label>
				<select
					id="create-assignee"
					bind:value={assigneeId}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				>
					<option value="">Unassigned</option>
					{#each data.members as member}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label for="create-due" class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Due date</label>
			<input
				id="create-due"
				type="date"
				bind:value={dueDate}
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
		</div>

		{#if data.labels.length > 0}
			<div>
				<span class="mb-1 block text-xs text-surface-600 dark:text-surface-400">Labels</span>
				<div class="flex flex-wrap gap-1">
					{#each data.labels as label}
						<button
							type="button"
							onclick={() => toggleLabel(label.id)}
							class="rounded-full border px-2 py-0.5 text-xs transition {selectedLabelIds.includes(label.id) ? 'border-brand-500 ring-1 ring-brand-500' : 'border-surface-300 dark:border-surface-700'}"
							style="background-color: {label.color}20; color: {label.color}"
						>
							{label.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<button
				type="button"
				onclick={() => { showCreate = false; resetForm(); }}
				class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={creating || !title.trim()}
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{creating ? 'Creating...' : 'Create'}
			</button>
		</div>
	</form>
</Modal>

<TaskDetailPanel
	task={panelTask}
	statuses={data.statuses}
	members={data.members}
	projectSlug={data.project.slug}
	currentUserId={data.user?.id ?? ''}
	onclose={() => (panelTask = null)}
	onupdated={refreshPanel}
/>
