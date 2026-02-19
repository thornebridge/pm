<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll, goto } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import MarkdownPreview from '$lib/components/markdown/MarkdownPreview.svelte';

	let { data } = $props();

	let newStatusName = $state('');
	let newStatusColor = $state('#64748b');
	let newLabelName = $state('');
	let newLabelColor = $state('#2d4f3e');

	// Import state
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let importResult = $state<{ imported: number; total: number } | null>(null);

	// README state
	let editingReadme = $state(false);
	let readmeInput = $state(data.project.readme ?? '');
	$effect(() => { readmeInput = data.project.readme ?? ''; });

	// Default assignee
	let defaultAssigneeId = $state(data.project.defaultAssigneeId ?? '');
	$effect(() => { defaultAssigneeId = data.project.defaultAssigneeId ?? ''; });

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

	async function saveReadme() {
		try {
			await api(`/api/projects/${data.project.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ readme: readmeInput || null })
			});
			editingReadme = false;
			await invalidateAll();
			showToast('README saved');
		} catch {
			showToast('Failed to save README', 'error');
		}
	}

	async function updateDefaultAssignee() {
		try {
			await api(`/api/projects/${data.project.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ defaultAssigneeId: defaultAssigneeId || null })
			});
			await invalidateAll();
			showToast('Default assignee updated');
		} catch {
			showToast('Failed to update', 'error');
		}
	}

	let deletingStatusId = $state<string | null>(null);
	let deletingLabelId = $state<string | null>(null);
	let deletingProject = $state(false);

	async function deleteStatus(id: string) {
		if (!confirm('Delete this status? This cannot be undone.')) return;
		deletingStatusId = id;
		try {
			await api(`/api/projects/${data.project.id}/statuses`, {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			showToast('Status deleted');
			await invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to delete status', 'error');
		} finally {
			deletingStatusId = null;
		}
	}

	async function deleteLabel(id: string) {
		if (!confirm('Delete this label? This cannot be undone.')) return;
		deletingLabelId = id;
		try {
			await api(`/api/projects/${data.project.id}/labels`, {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			showToast('Label deleted');
			await invalidateAll();
		} catch {
			showToast('Failed to delete label', 'error');
		} finally {
			deletingLabelId = null;
		}
	}

	async function deleteProject() {
		if (!confirm('Delete this project and ALL its tasks? This cannot be undone.')) return;
		deletingProject = true;
		try {
			await api(`/api/projects/${data.project.id}`, {
				method: 'DELETE'
			});
			showToast('Project deleted');
			goto('/projects');
		} catch {
			showToast('Failed to delete project', 'error');
		} finally {
			deletingProject = false;
		}
	}

	async function toggleArchive() {
		const newState = !data.project.archived;
		try {
			await api(`/api/projects/${data.project.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ archived: newState })
			});
			showToast(newState ? 'Project archived' : 'Project unarchived');
			await invalidateAll();
		} catch {
			showToast('Failed to update project', 'error');
		}
	}

	async function handleImport() {
		if (!importFile) return;
		importing = true;
		importResult = null;
		try {
			const formData = new FormData();
			formData.append('file', importFile);

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
	<!-- README -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Project README</h2>
		{#if editingReadme}
			<textarea
				bind:value={readmeInput}
				rows={8}
				placeholder="Write a project overview (markdown supported)..."
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			></textarea>
			<div class="mt-2 flex gap-2">
				<button onclick={saveReadme} class="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500">Save</button>
				<button onclick={() => { editingReadme = false; readmeInput = data.project.readme ?? ''; }} class="text-xs text-surface-600 hover:text-surface-900 dark:text-surface-400">Cancel</button>
			</div>
		{:else if data.project.readme}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div onclick={() => (editingReadme = true)} onkeydown={() => {}} class="cursor-pointer rounded-md bg-surface-100 p-4 hover:ring-1 hover:ring-brand-500/30 dark:bg-surface-800/50">
				<MarkdownPreview content={data.project.readme} />
			</div>
		{:else}
			<button onclick={() => (editingReadme = true)} class="w-full rounded-md border border-dashed border-surface-300 p-4 text-left text-sm text-surface-500 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700">
				Add a project README...
			</button>
		{/if}
	</section>

	<!-- Default Assignee -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Default Assignee</h2>
		<p class="mb-2 text-xs text-surface-500">Automatically assigned to new tasks when no assignee is specified.</p>
		<div class="flex items-center gap-2">
			<select
				bind:value={defaultAssigneeId}
				class="flex-1 rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			>
				<option value="">None</option>
				{#each data.members as member}
					<option value={member.id}>{member.name}</option>
				{/each}
			</select>
			<button
				onclick={updateDefaultAssignee}
				class="rounded-md bg-surface-200 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
			>Save</button>
		</div>
	</section>

	<!-- Statuses -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Statuses</h2>
		<div class="mb-3 space-y-1">
			{#each data.statuses as status}
				<div class="group flex items-center gap-2 rounded-md border border-surface-300 px-3 py-2 dark:border-surface-800">
					<div class="h-3 w-3 rounded-full" style="background-color: {status.color}"></div>
					<span class="flex-1 text-sm text-surface-700 dark:text-surface-300">{status.name}</span>
					{#if status.isClosed}
						<span class="text-xs text-surface-500 dark:text-surface-600">(closed)</span>
					{/if}
					<button
						onclick={() => deleteStatus(status.id)}
						disabled={deletingStatusId === status.id}
						class="text-surface-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
						title="Delete status"
					>&times;</button>
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
				<div class="group flex items-center gap-2 rounded-md border border-surface-300 px-3 py-2 dark:border-surface-800">
					<div class="h-3 w-3 rounded-full" style="background-color: {label.color}"></div>
					<span class="flex-1 text-sm text-surface-700 dark:text-surface-300">{label.name}</span>
					<button
						onclick={() => deleteLabel(label.id)}
						disabled={deletingLabelId === label.id}
						class="text-surface-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
						title="Delete label"
					>&times;</button>
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
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Import Tasks</h2>
		<p class="mb-3 text-xs text-surface-500">
			Upload a CSV file with columns: <code class="rounded bg-surface-200 px-1 dark:bg-surface-800">title</code> (required),
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">description</code>,
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">priority</code>,
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">status</code>,
			<code class="rounded bg-surface-200 px-1 dark:bg-surface-800">assignee</code>,
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

	<!-- Archive -->
	<section class="border-t border-surface-300 pt-8 dark:border-surface-800">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Danger Zone</h2>
		<div class="space-y-4">
			<div class="rounded-md border border-surface-300 p-4 dark:border-surface-800">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
							{data.project.archived ? 'Unarchive project' : 'Archive project'}
						</p>
						<p class="text-xs text-surface-500">
							{data.project.archived ? 'Restore this project to the sidebar and active projects list.' : 'Hide this project from the sidebar. It can be restored later.'}
						</p>
					</div>
					<button
						onclick={toggleArchive}
						class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:border-surface-400 hover:text-surface-900 dark:border-surface-700 dark:text-surface-400 dark:hover:text-surface-100"
					>
						{data.project.archived ? 'Unarchive' : 'Archive'}
					</button>
				</div>
			</div>

			<div class="rounded-md border border-red-300 p-4 dark:border-red-900">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">Delete project</p>
						<p class="text-xs text-surface-500">Permanently delete this project and all its tasks.</p>
					</div>
					<button
						onclick={deleteProject}
						disabled={deletingProject}
						class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
					>
						{deletingProject ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	</section>
</div>
