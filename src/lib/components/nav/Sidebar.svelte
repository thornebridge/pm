<script lang="ts">
	import FolderTree from './FolderTree.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	interface Props {
		user: { name: string; role: string } | null;
		folders: Array<{ id: string; name: string; slug: string; parentId: string | null; color: string | null; position: number }>;
		projects: Array<{ id: string; name: string; slug: string; color: string; folderId: string | null }>;
		open: boolean;
		onclose: () => void;
		collapsed?: boolean;
		ontogglecollapse?: () => void;
	}

	let { user, folders, projects, open, onclose, collapsed = false, ontogglecollapse }: Props = $props();
</script>

<aside class="fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-surface-800 bg-surface-900 transition-all md:static md:translate-x-0 {open ? 'translate-x-0 w-60' : '-translate-x-full w-60'} {collapsed ? 'md:w-14' : 'md:w-60'}">
	<div class="flex h-12 items-center justify-between px-4">
		{#if !collapsed}
			<span class="text-sm font-semibold text-surface-100">PM</span>
		{/if}
		<button onclick={onclose} class="text-surface-500 hover:text-surface-300 md:hidden">&times;</button>
		{#if ontogglecollapse}
			<button
				onclick={ontogglecollapse}
				class="hidden rounded-md p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300 md:block {collapsed ? 'mx-auto' : ''}"
				title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform {collapsed ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			</button>
		{/if}
	</div>

	<nav class="flex-1 space-y-1 overflow-y-auto px-2 py-2">
		<a
			href="/dashboard"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 {collapsed ? 'justify-center' : ''}"
			title={collapsed ? 'Dashboard' : undefined}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
			</svg>
			{#if !collapsed}<span>Dashboard</span>{/if}
		</a>
		<a
			href="/my-tasks"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 {collapsed ? 'justify-center' : ''}"
			title={collapsed ? 'My Tasks' : undefined}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
				<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
			</svg>
			{#if !collapsed}<span>My Tasks</span>{/if}
		</a>
		<a
			href="/projects"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 {collapsed ? 'justify-center' : ''}"
			title={collapsed ? 'Projects' : undefined}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
			</svg>
			{#if !collapsed}<span>Projects</span>{/if}
		</a>
		<a
			href="/activity"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 {collapsed ? 'justify-center' : ''}"
			title={collapsed ? 'Activity' : undefined}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
			</svg>
			{#if !collapsed}<span>Activity</span>{/if}
		</a>
		{#if user?.role === 'admin'}
			<a
				href="/admin"
				onclick={onclose}
				class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 {collapsed ? 'justify-center' : ''}"
				title={collapsed ? 'Admin' : undefined}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
				</svg>
				{#if !collapsed}<span>Admin</span>{/if}
			</a>
		{/if}

		{#if !collapsed && (folders.length > 0 || projects.length > 0)}
			<div class="pt-3 pb-1 px-2">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Workspace</span>
			</div>
			<FolderTree {folders} {projects} onnavigate={onclose} />
		{/if}

		{#if collapsed && projects.length > 0}
			<div class="mt-3 flex flex-col items-center gap-1.5">
				{#each projects as project (project.id)}
					<a
						href="/projects/{project.slug}/home"
						title={project.name}
						class="h-2.5 w-2.5 rounded-full transition-transform hover:scale-150"
						style="background-color: {project.color}"
					></a>
				{/each}
			</div>
		{/if}
	</nav>

	<div class="border-t border-surface-800 px-4 py-3">
		<div class="flex items-center justify-between">
			<a href="/settings" onclick={onclose} class="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-100">
				{#if user}
					<Avatar name={user.name} size="sm" />
				{/if}
				{#if !collapsed}
					{user?.name}
				{/if}
			</a>
			{#if !collapsed}
				<NotificationBell />
			{/if}
		</div>
	</div>
</aside>
