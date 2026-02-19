<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let name = $state('');
	let description = $state('');
	let color = $state('#2d4f3e');
	let templateProjectId = $state('');
	let creating = $state(false);

	async function create() {
		if (!name.trim()) return;
		creating = true;
		try {
			const project = await api<{ slug: string }>('/api/projects', {
				method: 'POST',
				body: JSON.stringify({
					name,
					description,
					color,
					templateProjectId: templateProjectId || undefined
				})
			});
			goto(`/projects/${project.slug}/board`);
		} catch (err) {
			showToast('Failed to create project', 'error');
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>New project</title>
</svelte:head>

<div class="mx-auto max-w-md p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">New project</h1>

	<form
		onsubmit={(e) => { e.preventDefault(); create(); }}
		class="space-y-4"
	>
		<div>
			<label for="name" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Name</label>
			<input
				id="name"
				bind:value={name}
				required
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
		</div>

		<div>
			<label for="desc" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Description</label>
			<textarea
				id="desc"
				bind:value={description}
				rows={3}
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			></textarea>
		</div>

		<div>
			<label for="color" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Color</label>
			<input id="color" type="color" bind:value={color} class="h-8 w-12 cursor-pointer rounded border border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800" />
		</div>

		{#if data.existingProjects.length > 0}
			<div>
				<label for="template" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Template (optional)</label>
				<select
					id="template"
					bind:value={templateProjectId}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
				>
					<option value="">None — use default statuses</option>
					{#each data.existingProjects as project}
						<option value={project.id}>{project.name}</option>
					{/each}
				</select>
				<p class="mt-1 text-[10px] text-surface-400">Copies statuses, labels, and task templates from the selected project.</p>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-2">
			<a href="/projects" class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</a>
			<button
				type="submit"
				disabled={creating || !name.trim()}
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{creating ? 'Creating...' : 'Create project'}
			</button>
		</div>
	</form>
</div>
