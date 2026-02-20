<script lang="ts">
	import FolderTree from './FolderTree.svelte';

	interface Folder {
		id: string;
		name: string;
		slug: string;
		parentId: string | null;
		color: string | null;
		position: number;
	}

	interface Project {
		id: string;
		name: string;
		slug: string;
		color: string;
		folderId: string | null;
	}

	interface Props {
		folders: Folder[];
		projects: Project[];
		parentId?: string | null;
		depth?: number;
		onnavigate?: () => void;
	}

	let { folders, projects, parentId = null, depth = 0, onnavigate }: Props = $props();

	let collapsed = $state<Record<string, boolean>>({});

	const childFolders = $derived(
		folders.filter((f) => f.parentId === parentId).sort((a, b) => a.position - b.position)
	);

	const childProjects = $derived(
		projects.filter((p) => p.folderId === parentId).sort((a, b) => a.name.localeCompare(b.name))
	);

	function toggle(folderId: string) {
		collapsed[folderId] = !collapsed[folderId];
	}
</script>

{#each childFolders as folder (folder.id)}
	<div>
		<button
			onclick={() => toggle(folder.id)}
			class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm text-surface-700 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-800"
			style="padding-left: {depth * 12 + 8}px"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 transition-transform {collapsed[folder.id] ? '' : 'rotate-90'}" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-surface-500" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
			</svg>
			<span class="truncate">{folder.name}</span>
		</button>
		{#if !collapsed[folder.id]}
			<FolderTree
				{folders}
				{projects}
				parentId={folder.id}
				depth={depth + 1}
				{onnavigate}
			/>
		{/if}
	</div>
{/each}

{#each childProjects as project (project.id)}
	<a
		href="/projects/{project.slug}/home"
		onclick={() => onnavigate?.()}
		class="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-surface-700 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-800"
		style="padding-left: {depth * 12 + 8}px"
	>
		<div class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: {project.color}"></div>
		<span class="truncate">{project.name}</span>
	</a>
{/each}
