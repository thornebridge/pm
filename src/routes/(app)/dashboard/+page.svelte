<script lang="ts">
	import MyTasksWidget from '$lib/components/dashboard/MyTasksWidget.svelte';
	import ProjectSummary from '$lib/components/dashboard/ProjectSummary.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">Dashboard</h1>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<div class="space-y-6">
			<MyTasksWidget tasks={data.myTasks} />
			<ProjectSummary projects={data.projects} />
		</div>
		<RecentActivity activity={data.recentActivity} />
	</div>
</div>
