<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { connectWs, disconnectWs } from '$lib/stores/websocket.js';
	import { handleGlobalKeydown, registerShortcut, unregisterShortcut, registerMetaShortcut, unregisterMetaShortcut, SHORTCUT_HELP } from '$lib/utils/keyboard.js';
	import Sidebar from '$lib/components/nav/Sidebar.svelte';
	import SearchPalette from '$lib/components/SearchPalette.svelte';

	let { data, children } = $props();
	let sidebarOpen = $state(false);
	let showShortcuts = $state(false);
	let showSearch = $state(false);

	onMount(() => {
		connectWs();
		registerShortcut('?', () => (showShortcuts = !showShortcuts));
		registerShortcut('p', () => goto('/projects'));
		registerShortcut('d', () => goto('/dashboard'));
		registerShortcut('m', () => goto('/my-tasks'));
		registerShortcut('a', () => goto('/activity'));
		registerShortcut('/', () => (showSearch = true));
		registerShortcut('escape', () => {
			showShortcuts = false;
			showSearch = false;
		});
		registerMetaShortcut('k', () => (showSearch = true));
	});
	onDestroy(() => {
		disconnectWs();
		unregisterShortcut('?');
		unregisterShortcut('p');
		unregisterShortcut('d');
		unregisterShortcut('m');
		unregisterShortcut('a');
		unregisterShortcut('/');
		unregisterShortcut('escape');
		unregisterMetaShortcut('k');
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="flex h-screen overflow-hidden">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 md:hidden" onclick={() => (sidebarOpen = false)} onkeydown={() => {}}></div>
	{/if}

	<Sidebar
		user={data.user}
		folders={data.folders}
		projects={data.sidebarProjects}
		open={sidebarOpen}
		onclose={() => (sidebarOpen = false)}
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
			<span class="ml-3 text-sm font-semibold text-surface-900 dark:text-surface-100">PM</span>
		</header>
		<main class="flex-1 overflow-auto">
			{@render children()}
		</main>
	</div>
</div>

<!-- Search palette -->
<SearchPalette open={showSearch} onclose={() => (showSearch = false)} />

<!-- Keyboard shortcuts help modal -->
{#if showShortcuts}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60"
		onclick={() => (showShortcuts = false)}
		onkeydown={(e) => { if (e.key === 'Escape') showShortcuts = false; }}
	>
		<div class="w-80 rounded-lg border border-surface-300 bg-surface-50 p-4 shadow-xl dark:border-surface-700 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Keyboard Shortcuts</h3>
			<div class="space-y-2">
				{#each SHORTCUT_HELP as shortcut}
					<div class="flex items-center justify-between">
						<span class="text-sm text-surface-600 dark:text-surface-400">{shortcut.description}</span>
						<kbd class="rounded border border-surface-300 bg-surface-200 px-1.5 py-0.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">{shortcut.key}</kbd>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
