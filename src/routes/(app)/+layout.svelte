<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { connectWs, disconnectWs } from '$lib/stores/websocket.js';
	import { handleGlobalKeydown, registerShortcut, unregisterShortcut, registerMetaShortcut, unregisterMetaShortcut, SHORTCUT_GROUPS } from '$lib/utils/keyboard.js';
	import Sidebar from '$lib/components/nav/Sidebar.svelte';
	import SearchPalette from '$lib/components/SearchPalette.svelte';
	import QuickCreateTask from '$lib/components/task/QuickCreateTask.svelte';
	import DialerWidget from '$lib/components/crm/DialerWidget.svelte';

	import { browser } from '$app/environment';

	let { data, children } = $props();
	let sidebarOpen = $state(false);
	let sidebarCollapsed = $state(browser ? localStorage.getItem('pm-sidebar-collapsed') === 'true' : false);
	let showShortcuts = $state(false);
	let showSearch = $state(false);
	let showQuickCreate = $state(false);

	function toggleSidebarCollapse() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem('pm-sidebar-collapsed', String(sidebarCollapsed));
	}

	// Derive current project slug from URL
	const currentProjectSlug = $derived.by(() => {
		const match = page.url.pathname.match(/^\/projects\/([^/]+)/);
		return match ? match[1] : null;
	});

	// Derive current project ID for quick create
	const currentProjectId = $derived.by(() => {
		if (!currentProjectSlug) return undefined;
		const p = data.sidebarProjects.find((p) => p.slug === currentProjectSlug);
		return p?.id;
	});

	// Build theme CSS override string from server-loaded variables
	const themeCss = $derived.by(() => {
		if (!data.themeVariables && data.themeMode === 'dark') return '';
		const parts: string[] = [];
		if (data.themeVariables) {
			const entries = Object.entries(data.themeVariables)
				.filter(([k]) => !k.startsWith('--pm-'))
				.map(([k, v]) => `${k}: ${v};`)
				.join(' ');
			parts.push(`:root { ${entries} }`);
		}
		if (data.themeMode === 'light') {
			parts.push('html { color-scheme: light; background-color: var(--color-surface-50); color: var(--color-surface-900); }');
		}
		return parts.join('\n');
	});

	// Dynamic theme-color for browser bar / PWA
	const themeColor = $derived(data.themeVariables?.['--color-brand-600'] || '#2d4f3e');

	// Style option derivations from theme variables
	const textureClass = $derived.by(() => {
		const texture = data.themeVariables?.['--pm-texture'];
		if (texture === 'grid') return 'pm-texture-grid';
		if (texture === 'dots') return 'pm-texture-dots';
		return '';
	});

	// Manage dark/light class + style data attributes on <html> element
	$effect(() => {
		if (!browser) return;
		const html = document.documentElement;
		if (data.themeMode === 'light') {
			html.classList.remove('dark');
			html.classList.add('light');
		} else {
			html.classList.remove('light');
			html.classList.add('dark');
		}

		// Set style option data attributes
		const vars = data.themeVariables;
		html.dataset.cardStyle = vars?.['--pm-card-style'] || 'rounded';
		html.dataset.depthStyle = vars?.['--pm-depth-style'] || 'shadow';
		html.dataset.gradient = vars?.['--pm-gradient'] || 'none';
	});

	onMount(() => {
		connectWs();
		registerShortcut('?', () => (showShortcuts = !showShortcuts));
		registerShortcut('p', () => goto('/projects'));
		registerShortcut('d', () => goto('/dashboard'));
		registerShortcut('m', () => goto('/my-tasks'));
		registerShortcut('a', () => goto('/activity'));
		registerShortcut('/', () => (showSearch = true));
		registerShortcut('n', () => (showQuickCreate = true));
		registerShortcut('escape', () => {
			showShortcuts = false;
			showSearch = false;
			showQuickCreate = false;
		});
		registerMetaShortcut('k', () => (showSearch = true));
		registerMetaShortcut('n', () => (showQuickCreate = true));
	});
	onDestroy(() => {
		disconnectWs();
		unregisterShortcut('?');
		unregisterShortcut('p');
		unregisterShortcut('d');
		unregisterShortcut('m');
		unregisterShortcut('a');
		unregisterShortcut('/');
		unregisterShortcut('n');
		unregisterShortcut('escape');
		unregisterMetaShortcut('k');
		unregisterMetaShortcut('n');
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<meta name="theme-color" content={themeColor} />
	{#if themeCss}
		{@html `<style>${themeCss}</style>`}
	{/if}
</svelte:head>

<div class="flex h-screen overflow-hidden">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40 md:hidden" onclick={() => (sidebarOpen = false)} onkeydown={() => {}} transition:fade={{ duration: 150 }}>
			<div class="absolute inset-0 bg-black/30 dark:bg-black/50"></div>
		</div>
	{/if}

	<Sidebar
		user={data.user}
		folders={data.folders}
		projects={data.sidebarProjects}
		open={sidebarOpen}
		onclose={() => (sidebarOpen = false)}
		collapsed={sidebarCollapsed}
		ontogglecollapse={toggleSidebarCollapse}
		platformName={data.platformName}
		telnyxEnabled={data.telnyxEnabled}
		hasLogo={data.hasLogo}
	/>

	<!-- Main content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Mobile header -->
		<header class="flex h-12 items-center border-b border-surface-300 px-4 dark:border-surface-800 md:hidden">
			<button onclick={() => (sidebarOpen = true)} aria-label="Open menu" class="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
				</svg>
			</button>
			<span class="ml-3 text-sm font-semibold text-surface-900 dark:text-surface-100">{data.platformName}</span>
		</header>
		<main class="flex-1 overflow-auto {textureClass}">
			{@render children()}
		</main>
	</div>
</div>

<!-- Search palette -->
<SearchPalette
	open={showSearch}
	onclose={() => (showSearch = false)}
	projectSlug={currentProjectSlug}
	isAdmin={data.user?.role === 'admin'}
/>

<!-- Quick create task -->
<QuickCreateTask
	open={showQuickCreate}
	onclose={() => (showQuickCreate = false)}
	projects={data.sidebarProjects}
	currentProjectId={currentProjectId}
/>

<!-- Telnyx dialer widget -->
{#if data.telnyxEnabled}
	<DialerWidget />
{/if}

<!-- Keyboard shortcuts help modal -->
{#if showShortcuts}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center"
		onclick={() => (showShortcuts = false)}
		onkeydown={(e) => { if (e.key === 'Escape') showShortcuts = false; }}
	>
		<div class="absolute inset-0 bg-black/40 dark:bg-black/60" transition:fade={{ duration: 150 }}></div>
		<div class="relative w-96 rounded-lg border border-surface-300 bg-surface-50 p-4 shadow-xl dark:border-surface-700 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Keyboard Shortcuts</h3>
			<div class="space-y-4">
				{#each SHORTCUT_GROUPS as group}
					<div>
						<h4 class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500">{group.group}</h4>
						<div class="space-y-1.5">
							{#each group.shortcuts as shortcut}
								<div class="flex items-center justify-between">
									<span class="text-sm text-surface-600 dark:text-surface-400">{shortcut.description}</span>
									<kbd class="rounded border border-surface-300 bg-surface-200 px-1.5 py-0.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">{shortcut.key}</kbd>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
