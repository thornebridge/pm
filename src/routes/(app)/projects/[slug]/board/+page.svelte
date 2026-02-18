<script lang="ts">
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let showCreate = $state(false);
	let title = $state('');
	let priority = $state<'urgent' | 'high' | 'medium' | 'low'>('medium');
	let creating = $state(false);

	async function createTask() {
		if (!title.trim()) return;
		creating = true;
		try {
			await api(`/api/projects/${data.project.id}/tasks`, {
				method: 'POST',
				body: JSON.stringify({ title, priority })
			});
			title = '';
			priority = 'medium';
			showCreate = false;
			await invalidateAll();
		} catch (err) {
			showToast('Failed to create task', 'error');
		} finally {
			creating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
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
		<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Board</h2>
		<button
			onclick={() => (showCreate = true)}
			class="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500"
		>
			New task <kbd class="ml-1 rounded bg-indigo-700 px-1 text-[10px]">C</kbd>
		</button>
	</div>

	<KanbanBoard
		statuses={data.statuses}
		tasks={data.tasks}
		projectId={data.project.id}
		projectSlug={data.project.slug}
	/>
</div>

<Modal open={showCreate} onclose={() => (showCreate = false)} title="New task">
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
			class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
			autofocus
		/>
		<div>
			<label for="priority" class="mb-1 block text-xs text-slate-400">Priority</label>
			<select
				id="priority"
				bind:value={priority}
				class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
			>
				<option value="urgent">Urgent</option>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
		</div>
		<div class="flex justify-end gap-2">
			<button
				type="button"
				onclick={() => (showCreate = false)}
				class="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={creating || !title.trim()}
				class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
			>
				{creating ? 'Creating...' : 'Create'}
			</button>
		</div>
	</form>
</Modal>
