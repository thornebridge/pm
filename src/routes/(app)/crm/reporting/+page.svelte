<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency.js';
	import PeriodSelector from '$lib/components/crm/PeriodSelector.svelte';
	import FunnelChart from '$lib/components/charts/FunnelChart.svelte';
	import DonutChart from '$lib/components/charts/DonutChart.svelte';
	import HorizontalBarChart from '$lib/components/charts/HorizontalBarChart.svelte';
	import StackedBarChart from '$lib/components/charts/StackedBarChart.svelte';
	import BarChart from '$lib/components/charts/BarChart.svelte';

	let { data } = $props();

	const activityTypeColors: Record<string, string> = {
		call: '#3b82f6',
		email: '#8b5cf6',
		meeting: '#f59e0b',
		note: '#6b7280'
	};

	const sourceColors: Record<string, string> = {
		referral: '#22c55e',
		inbound: '#3b82f6',
		outbound: '#f59e0b',
		website: '#8b5cf6',
		event: '#ec4899',
		partner: '#06b6d4',
		other: '#6b7280'
	};

	let sortCol = $state<string>('wonValue');
	let sortAsc = $state(false);

	const sortedReps = $derived(
		[...data.repPerformance].sort((a, b) => {
			const av = Number((a as Record<string, unknown>)[sortCol]) || 0;
			const bv = Number((b as Record<string, unknown>)[sortCol]) || 0;
			return sortAsc ? av - bv : bv - av;
		})
	);

	function toggleSort(col: string) {
		if (sortCol === col) sortAsc = !sortAsc;
		else { sortCol = col; sortAsc = false; }
	}

	const winLossTrendGroups = $derived(
		data.winLossTrend.map((m) => ({
			label: m.label,
			segments: [
				{ value: m.won, color: '#22c55e', label: 'Won' },
				{ value: m.lost, color: '#ef4444', label: 'Lost' }
			]
		}))
	);

	const totalWonLost = $derived(data.winLoss.won.count + data.winLoss.lost.count);
	const winRate = $derived(totalWonLost > 0 ? Math.round((data.winLoss.won.count / totalWonLost) * 100) : 0);
</script>

<svelte:head>
	<title>CRM Reporting</title>
</svelte:head>

<div class="p-6 space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Sales Reports</h1>
		<PeriodSelector period={data.period} customFrom={data.customFrom} customTo={data.customTo} />
	</div>

	<!-- Summary KPI row -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Won</p>
			<p class="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{data.winLoss.won.count}</p>
			<p class="text-[10px] text-surface-500">{formatCurrency(data.winLoss.won.value)}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Lost</p>
			<p class="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{data.winLoss.lost.count}</p>
			<p class="text-[10px] text-surface-500">{formatCurrency(data.winLoss.lost.value)}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Win Rate</p>
			<p class="mt-1 text-xl font-bold text-surface-900 dark:text-surface-100">{winRate}%</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Activities</p>
			<p class="mt-1 text-xl font-bold text-surface-900 dark:text-surface-100">{data.activityMetrics.total}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Avg Cycle</p>
			<p class="mt-1 text-xl font-bold text-surface-900 dark:text-surface-100">{data.avgSalesCycleDays}d</p>
		</div>
	</div>

	<!-- Section 1: Pipeline Funnel -->
	<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Pipeline Funnel</h2>
		<FunnelChart stages={data.pipelineFunnel} />
	</div>

	<!-- Section 2: Win/Loss Analysis -->
	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Win / Loss Ratio</h2>
			<DonutChart
				segments={[
					{ label: 'Won', value: data.winLoss.won.count, color: '#22c55e' },
					{ label: 'Lost', value: data.winLoss.lost.count, color: '#ef4444' }
				]}
				centerValue="{winRate}%"
				centerLabel="Win Rate"
			/>
		</div>

		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Lost Reasons</h2>
			{#if data.lostReasons.length === 0}
				<p class="text-sm text-surface-500">No lost deals in this period.</p>
			{:else}
				<HorizontalBarChart
					bars={data.lostReasons.map((r) => ({ label: r.reason, value: r.count, color: '#ef4444' }))}
				/>
			{/if}
		</div>
	</div>

	<!-- Win/Loss Trend -->
	{#if data.winLossTrend.length > 0}
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Win/Loss Trend</h2>
			<StackedBarChart
				groups={winLossTrendGroups}
				formatValue={(n) => formatCurrency(n)}
			/>
			<div class="mt-2 flex gap-4 justify-center">
				<div class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
					<span class="h-2.5 w-2.5 rounded-full bg-green-500"></span> Won
				</div>
				<div class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
					<span class="h-2.5 w-2.5 rounded-full bg-red-500"></span> Lost
				</div>
			</div>
		</div>
	{/if}

	<!-- Section 3: Activity Metrics -->
	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Activities by Type</h2>
			<BarChart
				bars={data.activityMetrics.byType.map((a) => ({
					label: a.type.charAt(0).toUpperCase() + a.type.slice(1),
					value: a.count,
					color: activityTypeColors[a.type] || '#6b7280'
				}))}
			/>
		</div>

		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Activity Summary</h2>
			<div class="space-y-4">
				<div>
					<p class="text-xs text-surface-500">Total Activities</p>
					<p class="text-2xl font-bold text-surface-900 dark:text-surface-100">{data.activityMetrics.total}</p>
				</div>
				<div>
					<p class="text-xs text-surface-500">Avg Call Duration</p>
					<p class="text-2xl font-bold text-surface-900 dark:text-surface-100">{data.activityMetrics.avgCallDuration}m</p>
				</div>
				<div class="space-y-2">
					{#each data.activityMetrics.byType as a}
						<div class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<span class="h-2 w-2 rounded-full" style="background-color: {activityTypeColors[a.type] || '#6b7280'}"></span>
								<span class="text-surface-700 dark:text-surface-300">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}s</span>
							</div>
							<span class="font-medium text-surface-900 dark:text-surface-100">{a.count}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Section 4: Rep Performance -->
	<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Rep Performance</h2>
		{#if sortedReps.length === 0}
			<p class="text-sm text-surface-500">No deal data for this period.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-surface-200 dark:border-surface-800">
							<th class="pb-2 pr-4 font-medium text-surface-500">Rep</th>
							{#each [
								{ key: 'deals', label: 'Deals' },
								{ key: 'totalValue', label: 'Total Value' },
								{ key: 'wonCount', label: 'Won' },
								{ key: 'wonValue', label: 'Won Value' },
								{ key: 'winRate', label: 'Win %' },
								{ key: 'avgCycleDays', label: 'Avg Cycle' },
								{ key: 'activities', label: 'Activities' }
							] as col}
								<th class="cursor-pointer pb-2 pr-4 font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300" onclick={() => toggleSort(col.key)}>
									{col.label}{sortCol === col.key ? (sortAsc ? ' \u2191' : ' \u2193') : ''}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each sortedReps as rep}
							<tr class="border-b border-surface-100 dark:border-surface-800/50">
								<td class="py-2 pr-4 font-medium text-surface-900 dark:text-surface-100">{rep.name}</td>
								<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{rep.deals}</td>
								<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{formatCurrency(rep.totalValue)}</td>
								<td class="py-2 pr-4 text-green-600 dark:text-green-400">{rep.wonCount}</td>
								<td class="py-2 pr-4 text-green-600 dark:text-green-400">{formatCurrency(rep.wonValue)}</td>
								<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{rep.winRate}%</td>
								<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{rep.avgCycleDays}d</td>
								<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{rep.activities}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Section 5: Conversion by Source -->
	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Win Rate by Source</h2>
			{#if data.sourceStats.length === 0}
				<p class="text-sm text-surface-500">No data for this period.</p>
			{:else}
				<HorizontalBarChart
					bars={data.sourceStats.map((s) => ({
						label: s.source.charAt(0).toUpperCase() + s.source.slice(1),
						value: s.winRate,
						color: sourceColors[s.source] || '#6b7280'
					}))}
					formatValue={(n) => `${n}%`}
				/>
			{/if}
		</div>

		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Source Breakdown</h2>
			{#if data.sourceStats.length === 0}
				<p class="text-sm text-surface-500">No data for this period.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="border-b border-surface-200 dark:border-surface-800">
								<th class="pb-2 pr-4 font-medium text-surface-500">Source</th>
								<th class="pb-2 pr-4 font-medium text-surface-500">Deals</th>
								<th class="pb-2 pr-4 font-medium text-surface-500">Won</th>
								<th class="pb-2 pr-4 font-medium text-surface-500">Win %</th>
								<th class="pb-2 pr-4 font-medium text-surface-500">Avg Size</th>
							</tr>
						</thead>
						<tbody>
							{#each data.sourceStats as src}
								<tr class="border-b border-surface-100 dark:border-surface-800/50">
									<td class="py-2 pr-4 font-medium text-surface-900 dark:text-surface-100">
										<div class="flex items-center gap-2">
											<span class="h-2 w-2 rounded-full" style="background-color: {sourceColors[src.source] || '#6b7280'}"></span>
											{src.source.charAt(0).toUpperCase() + src.source.slice(1)}
										</div>
									</td>
									<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{src.count}</td>
									<td class="py-2 pr-4 text-green-600 dark:text-green-400">{src.wonCount}</td>
									<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{src.winRate}%</td>
									<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{formatCurrency(src.avgDealSize)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
