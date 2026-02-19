<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();

	let showArchived = $state(false);

	const activeProjects = $derived(data.projects.filter((p) => !p.archived));
	const archivedProjects = $derived(data.projects.filter((p) => p.archived));
	const displayProjects = $derived(showArchived ? data.projects : activeProjects);
</script>

<svelte:head>
	<title>Projects</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Projects</h1>
		<div class="flex items-center gap-3">
			{#if archivedProjects.length > 0}
				<label class="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
					<input
						type="checkbox"
						bind:checked={showArchived}
						class="rounded border-surface-400 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
					/>
					Show archived ({archivedProjects.length})
				</label>
			{/if}
			<a
				href="/projects/new"
				class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
			>
				New project
			</a>
		</div>
	</div>

	{#if displayProjects.length === 0}
		<EmptyState
			icon="\uD83D\uDCC1"
			title="No projects yet"
			description="Create your first project to start organizing work."
			actionHref="/projects/new"
			actionLabel="New project"
		/>
	{:else}
		<div class="grid gap-3">
			{#each displayProjects as project}
				<a
					href="/projects/{project.slug}/board"
					class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 transition hover:border-surface-400 hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700 dark:hover:bg-surface-800/50 {project.archived ? 'opacity-60' : ''}"
				>
					<div
						class="h-3 w-3 rounded-full"
						style="background-color: {project.color}"
					></div>
					<div class="flex-1">
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
							{project.name}
							{#if project.archived}
								<span class="ml-1 text-xs text-surface-400">(archived)</span>
							{/if}
						</p>
						{#if project.description}
							<p class="mt-0.5 text-xs text-surface-500">{project.description}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
