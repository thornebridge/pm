<script lang="ts">
	import MyTasksWidget from '$lib/components/dashboard/MyTasksWidget.svelte';
	import ProjectSummary from '$lib/components/dashboard/ProjectSummary.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
	import SprintProgress from '$lib/components/dashboard/SprintProgress.svelte';
	import UpcomingDue from '$lib/components/dashboard/UpcomingDue.svelte';

	let { data } = $props();

	function greeting(): string {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	}

	const userName = $derived(data.user?.name?.split(' ')[0] || 'there');
	const pc = $derived(data.priorityCounts);
	const hasAnyTasks = $derived(pc.urgent + pc.high + pc.medium + pc.low > 0);
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div class="p-6">
	<!-- Greeting -->
	<div class="mb-6">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">{greeting()}, {userName}</h1>
	</div>

	<!-- Overdue alert -->
	{#if data.overdueTasks.length > 0}
		<div class="mb-6 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
			<div class="mb-1 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
				{data.overdueTasks.length} overdue task{data.overdueTasks.length > 1 ? 's' : ''}
			</div>
			<div class="space-y-1">
				{#each data.overdueTasks.slice(0, 5) as task}
					<a href="/projects/{task.projectSlug}/task/{task.number}" class="block text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
						#{task.number} {task.title} <span class="text-red-400 dark:text-red-500">({task.projectName})</span>
					</a>
				{/each}
				{#if data.overdueTasks.length > 5}
					<span class="text-[10px] text-red-400">+{data.overdueTasks.length - 5} more</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Priority stat cards -->
	{#if hasAnyTasks}
		<div class="mb-6 grid grid-cols-4 gap-3">
			<div class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
				<p class="text-2xl font-bold text-red-600 dark:text-red-400">{pc.urgent}</p>
				<p class="text-xs text-red-500 dark:text-red-500">Urgent</p>
			</div>
			<div class="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/50">
				<p class="text-2xl font-bold text-orange-600 dark:text-orange-400">{pc.high}</p>
				<p class="text-xs text-orange-500 dark:text-orange-500">High</p>
			</div>
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/50">
				<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{pc.medium}</p>
				<p class="text-xs text-blue-500 dark:text-blue-500">Medium</p>
			</div>
			<div class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
				<p class="text-2xl font-bold text-surface-600 dark:text-surface-400">{pc.low}</p>
				<p class="text-xs text-surface-500">Low</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<div class="space-y-6">
			<MyTasksWidget tasks={data.myTasks} />
			<SprintProgress sprints={data.activeSprints} />
			<UpcomingDue tasks={data.upcomingDue} />
			<ProjectSummary projects={data.projects} />
		</div>
		<RecentActivity activity={data.recentActivity} />
	</div>
</div>
