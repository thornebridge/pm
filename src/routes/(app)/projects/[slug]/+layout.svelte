<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { subscribeProject, unsubscribeProject } from '$lib/stores/websocket.js';

	let { data, children } = $props();

	const slug = $derived(data.project.slug);
	const currentPath = $derived(page.url.pathname);

	onMount(() => subscribeProject(data.project.id));
	onDestroy(() => unsubscribeProject(data.project.id));
</script>

<div class="flex h-full flex-col">
	<!-- Project header -->
	<div class="flex items-center gap-4 border-b border-surface-300 px-6 py-3 dark:border-surface-800">
		<div class="flex items-center gap-2">
			<div class="h-3 w-3 rounded-full" style="background-color: {data.project.color}"></div>
			<h1 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{data.project.name}</h1>
		</div>
		<nav class="flex gap-1">
			{#each [['Board', `/projects/${slug}/board`], ['List', `/projects/${slug}/list`], ['Table', `/projects/${slug}/table`], ['Gantt', `/projects/${slug}/gantt`], ['Calendar', `/projects/${slug}/calendar`], ['Sprints', `/projects/${slug}/sprints`], ['Analytics', `/projects/${slug}/analytics`], ['Settings', `/projects/${slug}/settings`]] as [label, href]}
				<a
					{href}
					class="rounded-md px-2.5 py-1 text-xs font-medium transition {currentPath === href || currentPath.startsWith(href + '/') ? 'bg-surface-200 text-surface-900 dark:bg-surface-800 dark:text-surface-100' : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
				>
					{label}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
