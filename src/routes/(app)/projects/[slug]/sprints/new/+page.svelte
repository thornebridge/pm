<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let name = $state('');
	let goal = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let creating = $state(false);

	async function create() {
		if (!name.trim()) return;
		creating = true;
		try {
			const sprint = await api<{ id: string }>(`/api/projects/${data.project.id}/sprints`, {
				method: 'POST',
				body: JSON.stringify({
					name,
					goal,
					startDate: startDate ? new Date(startDate).getTime() : null,
					endDate: endDate ? new Date(endDate).getTime() : null
				})
			});
			goto(`/projects/${data.project.slug}/sprints/${sprint.id}`);
		} catch {
			showToast('Failed to create sprint', 'error');
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} - New Sprint</title>
</svelte:head>

<div class="mx-auto max-w-md p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">New sprint</h1>

	<form onsubmit={(e) => { e.preventDefault(); create(); }} class="space-y-4">
		<div>
			<label for="name" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Name</label>
			<input
				id="name"
				bind:value={name}
				required
				placeholder="Sprint 1"
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>
		</div>

		<div>
			<label for="goal" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Goal</label>
			<textarea
				id="goal"
				bind:value={goal}
				rows={2}
				placeholder="What should this sprint achieve?"
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="start" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Start date</label>
				<input
					id="start"
					type="date"
					bind:value={startDate}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
			<div>
				<label for="end" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">End date</label>
				<input
					id="end"
					type="date"
					bind:value={endDate}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<a href="/projects/{data.project.slug}/sprints" class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</a>
			<button
				type="submit"
				disabled={creating || !name.trim()}
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{creating ? 'Creating...' : 'Create sprint'}
			</button>
		</div>
	</form>
</div>
