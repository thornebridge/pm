<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { subscribeProject, unsubscribeProject } from '$lib/stores/websocket.js';
	import { initFromUrl, resetStore, getUrlSearch } from '$lib/stores/filters.svelte.js';
	import FilterBar from '$lib/components/filter/FilterBar.svelte';

	let { data, children } = $props();

	const slug = $derived(data.project.slug);
	const currentPath = $derived(page.url.pathname);

	// Views that show the filter bar
	const filterViews = $derived(new Set([
		`/projects/${slug}/board`,
		`/projects/${slug}/list`,
		`/projects/${slug}/calendar`,
		`/projects/${slug}/gantt`
	]));

	const showFilterBar = $derived(filterViews.has(currentPath));

	// Tabs with preserved URL search params for filter views
	const tabs = $derived(
		([
			['Home', `/projects/${slug}/home`],
			['Board', `/projects/${slug}/board`],
			['List', `/projects/${slug}/list`],
			['Gantt', `/projects/${slug}/gantt`],
			['Calendar', `/projects/${slug}/calendar`],
			['Sprints', `/projects/${slug}/sprints`],
			['Automations', `/projects/${slug}/automations`],
			['Settings', `/projects/${slug}/settings`]
		] as const).map(([label, href]) => {
			const preserve = filterViews.has(href);
			return { label, href: preserve ? href + getUrlSearch() : href };
		})
	);

	let views = $state(data.views ?? []);

	// Keep views in sync when data changes (e.g., navigation)
	$effect(() => {
		views = data.views ?? [];
	});

	onMount(() => {
		initFromUrl();
		subscribeProject(data.project.id);
	});

	onDestroy(() => {
		resetStore();
		unsubscribeProject(data.project.id);
	});
</script>

<div class="flex h-full flex-col">
	<!-- Archived banner -->
	{#if data.project.archived}
		<div class="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
			This project is archived. Go to <a href="/projects/{slug}/settings" class="font-medium underline hover:no-underline">Settings</a> to unarchive it.
		</div>
	{/if}

	<!-- Project header -->
	<div class="flex items-center gap-4 border-b border-surface-300 px-6 py-3 dark:border-surface-800">
		<div class="flex items-center gap-2">
			{#if data.project.hasLogo}
				<img src="/api/projects/{data.project.id}/logo" alt="" class="h-5 w-5 rounded object-contain" />
			{:else}
				<div class="h-3 w-3 rounded-full" style="background-color: {data.project.color}"></div>
			{/if}
			<h1 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{data.project.name}</h1>
		</div>
		<nav class="flex gap-1">
			{#each tabs as { label, href }}
				<a
					{href}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition {currentPath === href.split('?')[0] || currentPath.startsWith(href.split('?')[0] + '/') ? 'bg-surface-200 text-surface-900 dark:bg-surface-800 dark:text-surface-100' : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
				>
					{label}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Filter Bar -->
	{#if showFilterBar}
		<FilterBar
			statuses={data.statuses}
			members={data.members}
			labels={data.labels}
			projectId={data.project.id}
			currentUserId={data.user?.id ?? ''}
			{views}
			onviewschange={(v) => (views = v)}
		/>
	{/if}

	<!-- Content -->
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
