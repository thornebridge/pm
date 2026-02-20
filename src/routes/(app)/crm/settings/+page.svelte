<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('');
	let editProbability = $state(0);
	let editIsClosed = $state(false);
	let editIsWon = $state(false);

	let showAdd = $state(false);
	let newName = $state('');
	let newColor = $state('#6366f1');
	let newProbability = $state(0);
	let newIsClosed = $state(false);
	let newIsWon = $state(false);

	function startEdit(stage: typeof data.stages[0]) {
		editingId = stage.id;
		editName = stage.name;
		editColor = stage.color;
		editProbability = stage.probability;
		editIsClosed = stage.isClosed;
		editIsWon = stage.isWon;
	}

	async function saveEdit() {
		if (!editingId || !editName.trim()) return;
		try {
			await api(`/api/crm/pipeline-stages/${editingId}`, {
				method: 'PATCH',
				body: JSON.stringify({
					name: editName.trim(),
					color: editColor,
					probability: editProbability,
					isClosed: editIsClosed,
					isWon: editIsWon
				})
			});
			editingId = null;
			showToast('Stage updated');
			await invalidateAll();
		} catch {
			showToast('Failed to update stage', 'error');
		}
	}

	async function addStage() {
		if (!newName.trim()) return;
		try {
			await api('/api/crm/pipeline-stages', {
				method: 'POST',
				body: JSON.stringify({
					name: newName.trim(),
					color: newColor,
					probability: newProbability,
					isClosed: newIsClosed,
					isWon: newIsWon
				})
			});
			showAdd = false;
			newName = '';
			newColor = '#6366f1';
			newProbability = 0;
			newIsClosed = false;
			newIsWon = false;
			showToast('Stage created');
			await invalidateAll();
		} catch {
			showToast('Failed to create stage', 'error');
		}
	}

	async function deleteStage(id: string) {
		if (!confirm('Delete this pipeline stage?')) return;
		try {
			await api(`/api/crm/pipeline-stages/${id}`, { method: 'DELETE' });
			showToast('Stage deleted');
			await invalidateAll();
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'Failed to delete stage', 'error');
		}
	}

	async function moveStage(id: string, direction: 'up' | 'down') {
		const sorted = [...data.stages].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((s) => s.id === id);
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		try {
			await api(`/api/crm/pipeline-stages/${sorted[idx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[swapIdx].position })
			});
			await api(`/api/crm/pipeline-stages/${sorted[swapIdx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[idx].position })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to reorder stages', 'error');
		}
	}
</script>

<svelte:head>
	<title>CRM Settings</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">Pipeline Settings</h1>

	<div class="rounded-lg border border-surface-300 dark:border-surface-800">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
					<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Order</th>
					<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Name</th>
					<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Color</th>
					<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Probability</th>
					<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Closed</th>
					<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Won</th>
					<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each [...data.stages].sort((a, b) => a.position - b.position) as stage, i (stage.id)}
					<tr class="border-b border-surface-200 dark:border-surface-800">
						{#if editingId === stage.id}
							<td class="px-4 py-2">{i + 1}</td>
							<td class="px-4 py-2">
								<input bind:value={editName} class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</td>
							<td class="px-4 py-2">
								<input type="color" bind:value={editColor} class="h-6 w-8 cursor-pointer" />
							</td>
							<td class="px-4 py-2 text-center">
								<input type="number" min="0" max="100" bind:value={editProbability} class="w-16 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-center text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
							</td>
							<td class="px-4 py-2 text-center">
								<input type="checkbox" bind:checked={editIsClosed} />
							</td>
							<td class="px-4 py-2 text-center">
								<input type="checkbox" bind:checked={editIsWon} />
							</td>
							<td class="px-4 py-2 text-right">
								<button onclick={saveEdit} class="text-xs text-brand-500 hover:underline">Save</button>
								<button onclick={() => (editingId = null)} class="ml-2 text-xs text-surface-500 hover:underline">Cancel</button>
							</td>
						{:else}
							<td class="px-4 py-2 text-surface-500">
								<div class="flex items-center gap-1">
									<button onclick={() => moveStage(stage.id, 'up')} disabled={i === 0} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&uarr;</button>
									<button onclick={() => moveStage(stage.id, 'down')} disabled={i === data.stages.length - 1} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&darr;</button>
								</div>
							</td>
							<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{stage.name}</td>
							<td class="px-4 py-2">
								<div class="h-4 w-4 rounded-full" style="background-color: {stage.color}"></div>
							</td>
							<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.probability}%</td>
							<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.isClosed ? 'Yes' : ''}</td>
							<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.isWon ? 'Yes' : ''}</td>
							<td class="px-4 py-2 text-right">
								<button onclick={() => startEdit(stage)} class="text-xs text-brand-500 hover:underline">Edit</button>
								<button onclick={() => deleteStage(stage.id)} class="ml-2 text-xs text-red-500 hover:underline">Delete</button>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if showAdd}
		<div class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<div>
				<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name</label>
				<input bind:value={newName} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Color</label>
				<input type="color" bind:value={newColor} class="h-8 w-10" />
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Probability</label>
				<input type="number" min="0" max="100" bind:value={newProbability} class="w-16 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
			</div>
			<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
				<input type="checkbox" bind:checked={newIsClosed} /> Closed
			</label>
			<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
				<input type="checkbox" bind:checked={newIsWon} /> Won
			</label>
			<button onclick={addStage} disabled={!newName.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
				Add Stage
			</button>
			<button onclick={() => (showAdd = false)} class="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
		</div>
	{:else}
		<button onclick={() => (showAdd = true)} class="mt-4 rounded-md border border-dashed border-surface-400 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800">
			+ Add Stage
		</button>
	{/if}
</div>
