<script lang="ts">
	interface Project {
		id: string;
		name: string;
		slug: string;
		color: string;
		description: string | null;
		updatedAt: number;
	}

	interface Props {
		projects: Project[];
	}

	let { projects }: Props = $props();

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<section>
	<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Projects</h2>

	{#if projects.length === 0}
		<p class="rounded-lg border border-surface-300 bg-surface-50 p-4 text-sm text-surface-500 dark:border-surface-800 dark:bg-surface-900">
			No projects yet.
		</p>
	{:else}
		<div class="grid gap-2 sm:grid-cols-2">
			{#each projects as project (project.id)}
				<a
					href="/projects/{project.slug}/board"
					class="rounded-lg border border-surface-300 bg-surface-50 p-3 transition hover:border-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
				>
					<div class="flex items-center gap-2">
						<div class="h-2.5 w-2.5 rounded-full" style="background-color: {project.color}"></div>
						<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{project.name}</span>
					</div>
					{#if project.description}
						<p class="mt-1 truncate text-xs text-surface-500">{project.description}</p>
					{/if}
					<p class="mt-1 text-[10px] text-surface-400">Updated {timeAgo(project.updatedAt)}</p>
				</a>
			{/each}
		</div>
	{/if}
</section>
