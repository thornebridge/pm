<script lang="ts">
	import FolderTree from './FolderTree.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { theme, toggleTheme } from '$lib/stores/theme.js';

	interface Props {
		user: { name: string; role: string } | null;
		folders: Array<{ id: string; name: string; slug: string; parentId: string | null; color: string | null; position: number }>;
		projects: Array<{ id: string; name: string; slug: string; color: string; folderId: string | null }>;
		open: boolean;
		onclose: () => void;
	}

	let { user, folders, projects, open, onclose }: Props = $props();
</script>

<aside class="fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-surface-300 bg-surface-50 transition-transform dark:border-surface-800 dark:bg-surface-900 md:static md:translate-x-0 {open ? 'translate-x-0' : '-translate-x-full'}">
	<div class="flex h-12 items-center justify-between px-4">
		<span class="text-sm font-semibold text-surface-900 dark:text-surface-100">PM</span>
		<button onclick={onclose} class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 md:hidden">&times;</button>
	</div>

	<nav class="flex-1 space-y-1 overflow-y-auto px-2 py-2">
		<a
			href="/dashboard"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
			</svg>
			Dashboard
		</a>
		<a
			href="/my-tasks"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
				<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
			</svg>
			My Tasks
		</a>
		<a
			href="/projects"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
			</svg>
			Projects
		</a>
		<a
			href="/activity"
			onclick={onclose}
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
			</svg>
			Activity
		</a>
		{#if user?.role === 'admin'}
			<a
				href="/admin"
				onclick={onclose}
				class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-200 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
				</svg>
				Admin
			</a>
		{/if}

		{#if folders.length > 0 || projects.length > 0}
			<div class="pt-3 pb-1 px-2">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Workspace</span>
			</div>
			<FolderTree {folders} {projects} onnavigate={onclose} />
		{/if}
	</nav>

	<div class="border-t border-surface-300 px-4 py-3 dark:border-surface-800">
		<div class="flex items-center justify-between">
			<a href="/settings" onclick={onclose} class="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">
				{#if user}
					<Avatar name={user.name} size="sm" />
				{/if}
				{user?.name}
			</a>
			<div class="flex items-center gap-1">
				<NotificationBell />
				<button
				onclick={toggleTheme}
				class="rounded-md p-1 text-surface-500 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
				title="Toggle theme"
			>
				{#if $theme === 'light'}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
					</svg>
				{/if}
			</button>
			</div>
		</div>
	</div>
</aside>
