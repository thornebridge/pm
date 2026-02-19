<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Projects</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Projects</h1>
		<a
			href="/projects/new"
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			New project
		</a>
	</div>

	{#if data.projects.length === 0}
		<p class="text-sm text-surface-500">No projects yet. Create one to get started.</p>
	{:else}
		<div class="grid gap-3">
			{#each data.projects as project}
				<a
					href="/projects/{project.slug}/board"
					class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 transition hover:border-surface-400 hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700 dark:hover:bg-surface-800/50"
				>
					<div
						class="h-3 w-3 rounded-full"
						style="background-color: {project.color}"
					></div>
					<div>
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{project.name}</p>
						{#if project.description}
							<p class="mt-0.5 text-xs text-surface-500">{project.description}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
