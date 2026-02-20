<script lang="ts">
	import BurndownChart from '$lib/components/charts/BurndownChart.svelte';
	import VelocityChart from '$lib/components/charts/VelocityChart.svelte';

	let { data } = $props();

	interface StatusEntry {
		name: string;
		color: string;
		isClosed: boolean;
		isFirst: boolean;
		position: number;
		count: number;
	}

	const totalTasks = $derived(data.statusDist.reduce((s: number, d: StatusEntry) => s + d.count, 0));
	const completedTasks = $derived(data.statusDist.filter((s: StatusEntry) => s.isClosed).reduce((s: number, d: StatusEntry) => s + d.count, 0));
	const inProgressTasks = $derived(
		data.statusDist
			.filter((s: StatusEntry) => !s.isClosed && !s.isFirst)
			.reduce((s: number, d: StatusEntry) => s + d.count, 0)
	);
	const completionPct = $derived(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

	const priorityColors: Record<string, string> = {
		urgent: '#ef4444',
		high: '#f97316',
		medium: '#eab308',
		low: '#6b7280'
	};

	function formatRelative(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>{data.project.name} - Home</title>
</svelte:head>

<div class="p-6">
	<!-- Summary metrics -->
	<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
			<div class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Total tasks</div>
			<div class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{totalTasks}</div>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
			<div class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Completed</div>
			<div class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</div>
			<div class="text-[10px] text-surface-500">{completionPct}%</div>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
			<div class="text-[10px] font-medium uppercase tracking-wide text-surface-500">In progress</div>
			<div class="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressTasks}</div>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
			<div class="text-[10px] font-medium uppercase tracking-wide text-surface-500">Overdue</div>
			<div class="mt-1 text-2xl font-bold {data.overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-surface-900 dark:text-surface-100'}">{data.overdueCount}</div>
		</div>
	</div>

	<!-- Recently Updated -->
	{#if data.recentTasks.length > 0}
		<div class="mb-6 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Recently Updated</h3>
			<div class="space-y-1.5">
				{#each data.recentTasks as task}
					<a
						href="/projects/{data.project.slug}/task/{task.number}"
						class="flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-surface-200 dark:hover:bg-surface-800"
					>
						<span class="h-2 w-2 shrink-0 rounded-full" style="background-color: {task.statusColor}"></span>
						<span class="text-xs text-surface-500">#{task.number}</span>
						<span class="flex-1 truncate text-sm text-surface-900 dark:text-surface-200">{task.title}</span>
						<span class="text-[10px] text-surface-400">{formatRelative(task.updatedAt)}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Status Distribution (Donut) -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Status Distribution</h3>
			{#if totalTasks === 0}
				<p class="text-xs text-surface-500">No tasks yet.</p>
			{:else}
				<div class="flex items-center gap-4">
					<svg viewBox="0 0 100 100" class="h-28 w-28">
						{#each data.statusDist as status, i}
							{@const offset = data.statusDist.slice(0, i).reduce((s: number, d: StatusEntry) => s + (d.count / totalTasks) * 100, 0)}
							{@const pct = (status.count / totalTasks) * 100}
							<circle
								cx="50" cy="50" r="40"
								fill="none"
								stroke={status.color}
								stroke-width="18"
								stroke-dasharray="{pct * 2.513} {(100 - pct) * 2.513}"
								stroke-dashoffset="{-offset * 2.513}"
								transform="rotate(-90 50 50)"
							/>
						{/each}
						<text x="50" y="54" text-anchor="middle" class="fill-surface-900 text-lg font-semibold dark:fill-surface-100">{totalTasks}</text>
					</svg>
					<div class="space-y-1">
						{#each data.statusDist as status}
							<div class="flex items-center gap-2 text-xs">
								<span class="h-2.5 w-2.5 rounded" style="background-color: {status.color}"></span>
								<span class="text-surface-700 dark:text-surface-300">{status.name}</span>
								<span class="text-surface-500">{status.count}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Priority Breakdown (Bar) -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Priority Breakdown</h3>
			{#if data.priorityDist.length === 0}
				<p class="text-xs text-surface-500">No tasks yet.</p>
			{:else}
				<div class="space-y-2">
					{#each data.priorityDist as item}
						{@const pct = totalTasks > 0 ? (item.count / totalTasks) * 100 : 0}
						<div>
							<div class="flex items-center justify-between text-xs">
								<span class="capitalize text-surface-700 dark:text-surface-300">{item.priority}</span>
								<span class="text-surface-500">{item.count}</span>
							</div>
							<div class="mt-0.5 h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
								<div class="h-full rounded-full" style="width: {pct}%; background-color: {priorityColors[item.priority] ?? '#6b7280'}"></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Team Workload (Bar) -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Team Workload</h3>
			{#if data.workload.length === 0}
				<p class="text-xs text-surface-500">No tasks assigned yet.</p>
			{:else}
				{@const maxCount = Math.max(...data.workload.map((w: { name: string; count: number }) => w.count))}
				<div class="space-y-2">
					{#each data.workload as person}
						{@const pct = (person.count / maxCount) * 100}
						<div>
							<div class="flex items-center justify-between text-xs">
								<span class="text-surface-700 dark:text-surface-300">{person.name}</span>
								<span class="text-surface-500">{person.count} tasks</span>
							</div>
							<div class="mt-0.5 h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
								<div class="h-full rounded-full bg-brand-500" style="width: {pct}%"></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Daily Activity -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Activity (30 days)</h3>
			{#if data.dailyActivity.length === 0}
				<p class="text-xs text-surface-500">No activity in the last 30 days.</p>
			{:else}
				{@const maxActivity = Math.max(...data.dailyActivity.map((d: { date: string; count: number }) => d.count))}
				<div class="flex items-end gap-0.5" style="height: 80px">
					{#each data.dailyActivity as day}
						{@const h = (day.count / maxActivity) * 100}
						<div
							class="flex-1 rounded-t bg-brand-500 opacity-75"
							style="height: {h}%"
							title="{day.date}: {day.count} actions"
						></div>
					{/each}
				</div>
				<div class="mt-1 flex justify-between text-[9px] text-surface-400">
					<span>{data.dailyActivity[0]?.date}</span>
					<span>{data.dailyActivity[data.dailyActivity.length - 1]?.date}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Sprint Burndown -->
	{#if data.activeSprint}
		<div class="mt-6 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Sprint Burndown — {data.activeSprint.name}</h3>
			<BurndownChart
				snapshots={data.burndownSnapshots}
				startDate={data.activeSprint.startDate}
				endDate={data.activeSprint.endDate}
			/>
		</div>
	{/if}

	<!-- Sprint Velocity -->
	{#if data.sprintVelocity.length > 0}
		<div class="mt-6 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Sprint Velocity</h3>
			<VelocityChart sprints={data.sprintVelocity} />
		</div>
	{/if}
</div>
