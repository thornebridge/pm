<script lang="ts">
	import SprintCard from '$lib/components/sprint/SprintCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.project.name} - Sprints</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Sprints</h2>
		<a
			href="/projects/{data.project.slug}/sprints/new"
			class="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-500"
		>
			New sprint
		</a>
	</div>

	{#if data.sprints.length === 0}
		<p class="text-sm text-surface-500">No sprints yet. Create one to start planning.</p>
	{:else}
		<div class="grid gap-3">
			{#each data.sprints as sprint (sprint.id)}
				<SprintCard {sprint} projectSlug={data.project.slug} />
			{/each}
		</div>
	{/if}
</div>
