<script lang="ts">
	import { browser } from '$app/environment';
	import FolderTree from './FolderTree.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { page } from '$app/state';
	interface Props {
		user: { name: string; role: string } | null;
		folders: Array<{ id: string; name: string; slug: string; parentId: string | null; color: string | null; position: number }>;
		projects: Array<{ id: string; name: string; slug: string; color: string; folderId: string | null }>;
		open: boolean;
		onclose: () => void;
		collapsed?: boolean;
		ontogglecollapse?: () => void;
		platformName?: string;
	}

	let { user, folders, projects, open, onclose, collapsed = false, ontogglecollapse, platformName = 'PM' }: Props = $props();

	const operationsLinks = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
		{ href: '/my-tasks', label: 'My Tasks', icon: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' },
		{ href: '/projects', label: 'Projects', icon: 'M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z' },
		{ href: '/activity', label: 'Activity', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' }
	];

	const crmLinks = [
		{ href: '/crm/dashboard', label: 'Dashboard', icon: 'M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z' },
		{ href: '/crm/pipeline', label: 'Pipeline', icon: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z' },
		{ href: '/crm/opportunities', label: 'Opportunities', icon: 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' },
		{ href: '/crm/companies', label: 'Companies', icon: 'M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z' },
		{ href: '/crm/contacts', label: 'Contacts', icon: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' },
		{ href: '/crm/activities', label: 'Activities', icon: 'M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z' },
		{ href: '/crm/tasks', label: 'Tasks', icon: 'M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z' },
		{ href: '/crm/proposals', label: 'Proposals', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8zm-6 3a1 1 0 100 2h3a1 1 0 100-2h-3z' }
	];

	// Persisted section collapse state
	let sections = $state<Record<string, boolean>>(
		browser ? JSON.parse(localStorage.getItem('pm-sidebar-sections') || '{}') : {}
	);

	function toggleSection(key: string) {
		sections[key] = !sections[key];
		localStorage.setItem('pm-sidebar-sections', JSON.stringify(sections));
	}

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function isCrmActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}

	const hasWorkspace = $derived(folders.length > 0 || projects.length > 0);
	const hasTools = $derived(user?.role === 'admin');
</script>

<aside class="fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-surface-800 bg-surface-900 transition-all md:static md:translate-x-0 {open ? 'translate-x-0 w-60' : '-translate-x-full w-60'} {collapsed ? 'md:w-14' : 'md:w-60'}">
	<div class="flex h-12 items-center justify-between px-4">
		{#if !collapsed}
			<span class="text-sm font-semibold text-surface-100">{platformName}</span>
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

	<nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
		<!-- Operations section -->
		{#if !collapsed}
			<button
				onclick={() => toggleSection('operations')}
				class="group flex w-full items-center gap-1 px-2 pt-1 pb-1"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-surface-600 opacity-0 transition-all group-hover:opacity-100 {sections.operations ? '-rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
				</svg>
				<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Operations</span>
			</button>
		{/if}
		{#if !sections.operations}
			{#each operationsLinks as link (link.href)}
				<a
					href={link.href}
					onclick={onclose}
					class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm {isActive(link.href) ? 'bg-surface-800 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'} {collapsed ? 'justify-center' : ''}"
					title={collapsed ? link.label : undefined}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d={link.icon} clip-rule="evenodd" />
					</svg>
					{#if !collapsed}<span>{link.label}</span>{/if}
				</a>
			{/each}
		{/if}

		<!-- Sales / CRM section -->
		{#if !collapsed}
			<button
				onclick={() => toggleSection('sales')}
				class="group flex w-full items-center gap-1 px-2 pt-3 pb-1"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-surface-600 opacity-0 transition-all group-hover:opacity-100 {sections.sales ? '-rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
				</svg>
				<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Sales</span>
			</button>
			{#if !sections.sales}
				{#each crmLinks as link (link.href)}
					<a
						href={link.href}
						onclick={onclose}
						class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm {isCrmActive(link.href) ? 'bg-surface-800 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'}"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d={link.icon} clip-rule="evenodd" />
						</svg>
						<span>{link.label}</span>
					</a>
				{/each}
			{/if}
		{:else}
			<div class="mt-3 flex flex-col items-center">
				<a
					href="/crm/pipeline"
					title="Sales"
					class="flex items-center justify-center rounded-md p-2 {page.url.pathname.startsWith('/crm') ? 'bg-surface-800 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" />
						<path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
					</svg>
				</a>
			</div>
		{/if}

		<!-- Tools section (admin only) -->
		{#if hasTools}
			{#if !collapsed}
				<button
					onclick={() => toggleSection('tools')}
					class="group flex w-full items-center gap-1 px-2 pt-3 pb-1"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-surface-600 opacity-0 transition-all group-hover:opacity-100 {sections.tools ? '-rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
					</svg>
					<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Tools</span>
				</button>
			{/if}
			{#if !sections.tools}
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
		{/if}

		<!-- Workspace section -->
		{#if hasWorkspace}
			{#if !collapsed}
				<button
					onclick={() => toggleSection('workspace')}
					class="group flex w-full items-center gap-1 px-2 pt-3 pb-1"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-surface-600 opacity-0 transition-all group-hover:opacity-100 {sections.workspace ? '-rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
					</svg>
					<span class="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Workspace</span>
				</button>
				{#if !sections.workspace}
					<FolderTree {folders} {projects} onnavigate={onclose} />
				{/if}
			{:else}
				{#if projects.length > 0}
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
			{/if}
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
