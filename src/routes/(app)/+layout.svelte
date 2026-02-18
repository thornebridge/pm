<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { connectWs, disconnectWs } from '$lib/stores/websocket.js';
	import { handleGlobalKeydown, registerShortcut, unregisterShortcut } from '$lib/utils/keyboard.js';

	let { data, children } = $props();
	let sidebarOpen = $state(false);
	let showShortcuts = $state(false);

	onMount(() => {
		connectWs();
		registerShortcut('?', () => (showShortcuts = !showShortcuts));
		registerShortcut('p', () => goto('/projects'));
	});
	onDestroy(() => {
		disconnectWs();
		unregisterShortcut('?');
		unregisterShortcut('p');
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="flex h-screen overflow-hidden">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40 bg-black/50 md:hidden" onclick={() => (sidebarOpen = false)} onkeydown={() => {}}></div>
	{/if}

	<!-- Sidebar -->
	<aside class="fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-transform md:static md:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
		<div class="flex h-12 items-center justify-between px-4">
			<span class="text-sm font-semibold text-slate-200">PM</span>
			<button onclick={() => (sidebarOpen = false)} class="text-slate-500 hover:text-slate-300 md:hidden">&times;</button>
		</div>
		<nav class="flex-1 space-y-1 px-2 py-2">
			<a
				href="/projects"
				onclick={() => (sidebarOpen = false)}
				class="flex items-center rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
			>
				Projects
			</a>
			{#if data.user?.role === 'admin'}
				<a
					href="/admin"
					onclick={() => (sidebarOpen = false)}
					class="flex items-center rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
				>
					Admin
				</a>
			{/if}
		</nav>
		<div class="border-t border-slate-800 px-4 py-3">
			<a href="/settings" onclick={() => (sidebarOpen = false)} class="text-sm text-slate-400 hover:text-slate-200">
				{data.user?.name}
			</a>
		</div>
	</aside>

	<!-- Main content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Mobile header -->
		<header class="flex h-12 items-center border-b border-slate-800 px-4 md:hidden">
			<button onclick={() => (sidebarOpen = true)} class="text-slate-400 hover:text-slate-200">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
				</svg>
			</button>
			<span class="ml-3 text-sm font-semibold text-slate-200">PM</span>
		</header>
		<main class="flex-1 overflow-auto">
			{@render children()}
		</main>
	</div>
</div>

<!-- Keyboard shortcuts help modal -->
{#if showShortcuts}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
		onclick={() => (showShortcuts = false)}
		onkeydown={(e) => { if (e.key === 'Escape') showShortcuts = false; }}
	>
		<div class="w-80 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
			<h3 class="mb-3 text-sm font-semibold text-slate-200">Keyboard Shortcuts</h3>
			<div class="space-y-2">
				{#each [['C', 'New task'], ['P', 'Go to projects'], ['/', 'Search'], ['?', 'Toggle this help']] as [key, desc]}
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-400">{desc}</span>
						<kbd class="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{key}</kbd>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
