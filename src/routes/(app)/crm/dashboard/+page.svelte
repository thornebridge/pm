<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency.js';

	let { data } = $props();

	function typeIcon(type: string) {
		switch (type) {
			case 'call': return '\u{1F4DE}';
			case 'email': return '\u{2709}\u{FE0F}';
			case 'meeting': return '\u{1F4C5}';
			case 'note': return '\u{1F4DD}';
			default: return '\u{1F4CB}';
		}
	}

	function relativeTime(ts: number) {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(ts).toLocaleDateString();
	}

	function daysUntil(ts: number) {
		const diff = ts - Date.now();
		const days = Math.ceil(diff / 86400000);
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `${days}d`;
	}

	function priorityIcon(p: string) {
		switch (p) {
			case 'urgent': return '\u{1F534}';
			case 'high': return '\u{1F7E0}';
			case 'medium': return '\u{1F7E1}';
			case 'low': return '\u{1F535}';
			default: return '';
		}
	}

	const maxBarValue = $derived(
		Math.max(...data.pipelineByStage.map((s) => s.value), 1)
	);
</script>

<svelte:head>
	<title>CRM Dashboard</title>
</svelte:head>

<div class="p-6 space-y-6">
	<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Sales Dashboard</h1>

	<!-- Metric cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Open Deals</p>
			<p class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{data.metrics.openDeals}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Pipeline Value</p>
			<p class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{formatCurrency(data.metrics.pipelineValue)}</p>
			<p class="text-[10px] text-surface-500">Weighted: {formatCurrency(data.metrics.weightedValue)}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Won This Month</p>
			<p class="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{data.metrics.wonThisMonth}</p>
			<p class="text-[10px] text-surface-500">{formatCurrency(data.metrics.wonValueThisMonth)}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Win Rate (90d)</p>
			<p class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{data.metrics.winRate}%</p>
		</div>
	</div>

	<!-- Two columns -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Pipeline by stage -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Pipeline by Stage</h2>
			{#if data.pipelineByStage.length === 0}
				<p class="text-sm text-surface-500">No pipeline data.</p>
			{:else}
				<div class="space-y-2.5">
					{#each data.pipelineByStage as stage}
						<div>
							<div class="flex items-center justify-between text-xs">
								<span class="text-surface-700 dark:text-surface-300">{stage.name}</span>
								<span class="text-surface-500">{stage.count} deals &middot; {formatCurrency(stage.value)}</span>
							</div>
							<div class="mt-1 h-2 w-full rounded-full bg-surface-200 dark:bg-surface-800">
								<div
									class="h-2 rounded-full transition-all"
									style="width: {Math.max((stage.value / maxBarValue) * 100, 2)}%; background-color: {stage.color}"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Closing soon -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Closing Soon</h2>
			{#if data.closingSoon.length === 0}
				<p class="text-sm text-surface-500">No deals closing in the next 30 days.</p>
			{:else}
				<div class="space-y-2">
					{#each data.closingSoon as opp}
						<a href="/crm/opportunities/{opp.id}" class="flex items-center justify-between rounded-md p-2 transition hover:bg-surface-100 dark:hover:bg-surface-800">
							<div>
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{opp.title}</p>
								<p class="text-[10px] text-surface-500">{opp.companyName}</p>
							</div>
							<div class="text-right">
								{#if opp.value}
									<p class="text-xs font-medium text-surface-900 dark:text-surface-100">{formatCurrency(opp.value, opp.currency)}</p>
								{/if}
								<p class="text-[10px] text-surface-500">{daysUntil(opp.expectedCloseDate!)}</p>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Upcoming activities -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Upcoming Activities</h2>
			{#if data.upcomingActivities.length === 0}
				<p class="text-sm text-surface-500">No upcoming activities.</p>
			{:else}
				<div class="space-y-2">
					{#each data.upcomingActivities as activity}
						<div class="flex items-center gap-2 rounded-md p-2">
							<span>{typeIcon(activity.type)}</span>
							<div class="flex-1">
								<p class="text-sm text-surface-900 dark:text-surface-100">{activity.subject}</p>
								<p class="text-[10px] text-surface-500">
									{activity.companyName || ''} &middot; {activity.scheduledAt ? new Date(activity.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Overdue tasks -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Overdue Tasks</h2>
			{#if data.overdueTasks.length === 0}
				<p class="text-sm text-green-600 dark:text-green-400">All caught up!</p>
			{:else}
				<div class="space-y-2">
					{#each data.overdueTasks as task}
						<div class="flex items-center gap-2 rounded-md p-2">
							<span>{priorityIcon(task.priority)}</span>
							<div class="flex-1">
								<p class="text-sm text-surface-900 dark:text-surface-100">{task.title}</p>
								<p class="text-[10px] text-red-500">
									Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
									{#if task.assigneeName}&middot; {task.assigneeName}{/if}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent activity feed -->
	<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Recent Activity</h2>
		{#if data.recentActivity.length === 0}
			<p class="text-sm text-surface-500">No recent activity.</p>
		{:else}
			<div class="space-y-2">
				{#each data.recentActivity as activity}
					<div class="flex items-center gap-3 rounded-md p-2">
						<span>{typeIcon(activity.type)}</span>
						<div class="flex-1">
							<p class="text-sm text-surface-900 dark:text-surface-100">{activity.subject}</p>
							<p class="text-[10px] text-surface-500">
								{activity.userName}
								{#if activity.companyName}&middot; {activity.companyName}{/if}
								&middot; {relativeTime(activity.createdAt)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
