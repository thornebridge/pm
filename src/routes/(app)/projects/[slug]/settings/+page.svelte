<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let newStatusName = $state('');
	let newStatusColor = $state('#64748b');
	let newLabelName = $state('');
	let newLabelColor = $state('#2d4f3e');

	// Import state
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let importResult = $state<{ imported: number; total: number } | null>(null);

	async function addStatus() {
		if (!newStatusName.trim()) return;
		try {
			await api(`/api/projects/${data.project.id}/statuses`, {
				method: 'POST',
				body: JSON.stringify({
					name: newStatusName,
					color: newStatusColor,
					position: data.statuses.length,
					isClosed: false
				})
			});
			newStatusName = '';
			newStatusColor = '#64748b';
			await invalidateAll();
		} catch {
			showToast('Failed to add status', 'error');
		}
	}

	async function addLabel() {
		if (!newLabelName.trim()) return;
		try {
			await api(`/api/projects/${data.project.id}/labels`, {
				method: 'POST',
				body: JSON.stringify({ name: newLabelName, color: newLabelColor })
			});
			newLabelName = '';
			newLabelColor = '#2d4f3e';
			await invalidateAll();
		} catch {
			showToast('Failed to add label', 'error');
		}
	}

	async function handleImport() {
		if (!importFile) return;
		importing = true;
		importResult = null;
		try {
			const formData = new FormData();
			formData.append('file', importFile);

			// Use fetch directly for FormData (no JSON content-type)
			const csrfMatch = document.cookie.match(/(?:^|;\s*)pm_csrf=([^;]*)/);
			const res = await fetch(`/api/projects/${data.project.id}/import`, {
				method: 'POST',
				body: formData,
				headers: csrfMatch ? { 'x-csrf-token': csrfMatch[1] } : {}
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Import failed');
			}

			importResult = await res.json();
			showToast(`Imported ${importResult!.imported} tasks`);
			importFile = null;
			await invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Import failed', 'error');
		} finally {
			importing = false;
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} - Settings</title>
</svelte:head>

<div class="mx-auto max-w-xl p-6">
	<!-- Statuses -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Statuses</h2>
		<div class="mb-3 space-y-1">
			{#each data.statuses as status}
				<div class="flex items-center gap-2 rounded-md border border-surface-300 px-3 py-2 dark:border-surface-800">
					<div class="h-3 w-3 rounded-full" style="background-color: {status.color}"></div>
					<span class="text-sm text-surface-700 dark:text-surface-300">{status.name}</span>
					{#if status.isClosed}
						<span class="text-xs text-surface-500 dark:text-surface-600">(closed)</span>
					{/if}
				</div>
			{/each}
		</div>
		<form
			onsubmit={(e) => { e.preventDefault(); addStatus(); }}
			class="flex items-center gap-2"
		>
			<input
				type="color"
				bind:value={newStatusColor}
				class="h-7 w-8 cursor-pointer rounded border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800"
			/>
			<input
				bind:value={newStatusName}
				placeholder="New status name"
				class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			<button
				type="submit"
				disabled={!newStatusName.trim()}
				class="rounded-md bg-surface-200 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-300 disabled:opacity-50 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
			>
				Add
			</button>
		</form>
	</section>

	<!-- Labels -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Labels</h2>
		<div class="mb-3 space-y-1">
			{#each data.labels as label}
				<div class="flex items-center gap-2 rounded-md border border-surface-300 px-3 py-2 dark:border-surface-800">
					<div class="h-3 w-3 rounded-full" style="background-color: {label.color}"></div>
					<span class="text-sm text-surface-700 dark:text-surface-300">{label.name}</span>
				</div>
			{/each}
			{#if data.labels.length === 0}
				<p class="text-sm text-surface-500">No labels yet.</p>
			{/if}
		</div>
		<form
			onsubmit={(e) => { e.preventDefault(); addLabel(); }}
			class="flex items-center gap-2"
		>
			<input
				type="color"
				bind:value={newLabelColor}
				class="h-7 w-8 cursor-pointer rounded border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800"
			/>
			<input
				bind:value={newLabelName}
				placeholder="New label name"
				class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
			<button
				type="submit"
				disabled={!newLabelName.trim()}
				class="rounded-md bg-surface-200 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-300 disabled:opacity-50 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
			>
				Add
			</button>
		</form>
	</section>

	<!-- Import -->
	<section>
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Import Tasks</h2>
		<p class="mb-3 text-xs text-surface-500">
			Upload a CSV file with columns: <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">title</code> (required),
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">description</code>,
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">priority</code> (urgent/high/medium/low),
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">status</code> (match by name),
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">assignee</code> (name or email),
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">due_date</code>.
		</p>
		<div class="flex items-center gap-2">
			<input
				type="file"
				accept=".csv,text/csv"
				onchange={(e) => {
					const input = e.currentTarget;
					importFile = input.files?.[0] ?? null;
				}}
				class="flex-1 text-sm text-surface-700 file:mr-2 file:rounded-md file:border-0 file:bg-surface-200 file:px-3 file:py-1.5 file:text-sm file:text-surface-700 dark:text-surface-300 dark:file:bg-surface-700 dark:file:text-surface-200"
			/>
			<button
				onclick={handleImport}
				disabled={!importFile || importing}
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{importing ? 'Importing...' : 'Import'}
			</button>
		</div>
		{#if importResult}
			<p class="mt-2 text-xs text-green-600 dark:text-green-500">
				Successfully imported {importResult.imported} of {importResult.total} tasks.
			</p>
		{/if}
	</section>
</div>
