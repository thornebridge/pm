<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatCurrency } from '$lib/utils/currency.js';
	import { forecastCategoryConfig, type ForecastCategory } from '$lib/utils/forecast.js';
	import ForecastCategoryBadge from '$lib/components/crm/ForecastCategoryBadge.svelte';
	import StackedBarChart from '$lib/components/charts/StackedBarChart.svelte';

	let { data } = $props();

	const categories: ForecastCategory[] = ['commit', 'best_case', 'upside', 'pipeline', 'omit'];

	function navigatePeriod(month: number, year: number) {
		const url = new URL($page.url);
		url.searchParams.set('month', String(month));
		url.searchParams.set('year', String(year));
		goto(url.toString(), { replaceState: true });
	}

	function toggleView(view: 'monthly' | 'quarterly') {
		const url = new URL($page.url);
		url.searchParams.set('view', view);
		goto(url.toString(), { replaceState: true });
	}

	async function updateCategory(dealId: string, category: string) {
		await fetch(`/api/crm/opportunities/${dealId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ forecastCategory: category || null })
		});
		// Reload page data
		goto($page.url.toString(), { invalidateAll: true });
	}

	// Grouped deals by category
	const groupedDeals = $derived(() => {
		const groups: Record<string, typeof data.forecastDeals> = {};
		for (const cat of categories) {
			const deals = data.forecastDeals.filter((d) => d.category === cat);
			if (deals.length > 0) groups[cat] = deals;
		}
		return groups;
	});

	// Rollup chart data
	const rollupGroups = $derived(
		data.rollupMonths.map((m) => ({
			label: m.label,
			segments: [
				{ value: m.commit, color: forecastCategoryConfig.commit.color, label: 'Commit' },
				{ value: m.best_case, color: forecastCategoryConfig.best_case.color, label: 'Best Case' },
				{ value: m.upside, color: forecastCategoryConfig.upside.color, label: 'Upside' }
			]
		}))
	);

	// Cumulative forecast totals for summary cards
	const commitTotal = $derived(data.categorySummary.commit.value);
	const bestCaseTotal = $derived(commitTotal + data.categorySummary.best_case.value);
	const upsideTotal = $derived(bestCaseTotal + data.categorySummary.upside.value);
	const pipelineTotal = $derived(upsideTotal + data.categorySummary.pipeline.value);
</script>

<svelte:head>
	<title>Sales Forecast</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Sales Forecast</h1>
		<div class="flex items-center gap-3">
			<!-- View toggle -->
			<div class="flex rounded-lg border border-surface-300 bg-surface-100 p-0.5 dark:border-surface-700 dark:bg-surface-800">
				<button
					onclick={() => toggleView('monthly')}
					class="rounded-md px-3 py-1 text-xs font-medium transition {data.viewMode === 'monthly' ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-100' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
				>
					Monthly
				</button>
				<button
					onclick={() => toggleView('quarterly')}
					class="rounded-md px-3 py-1 text-xs font-medium transition {data.viewMode === 'quarterly' ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-100' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
				>
					Quarterly
				</button>
			</div>

			<!-- Period selector -->
			<select
				value="{data.targetMonth}-{data.targetYear}"
				onchange={(e) => {
					const [m, y] = (e.target as HTMLSelectElement).value.split('-').map(Number);
					navigatePeriod(m, y);
				}}
				class="rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
			>
				{#each data.availableMonths as opt}
					<option value="{opt.month}-{opt.year}">{opt.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Forecast Summary Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/10">
			<p class="text-xs text-green-700 dark:text-green-400">Commit</p>
			<p class="mt-1 text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(commitTotal)}</p>
			<p class="text-[10px] text-green-600/70 dark:text-green-400/60">{data.categorySummary.commit.count} deals</p>
		</div>
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
			<p class="text-xs text-blue-700 dark:text-blue-400">Best Case</p>
			<p class="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(bestCaseTotal)}</p>
			<p class="text-[10px] text-blue-600/70 dark:text-blue-400/60">Commit + {data.categorySummary.best_case.count} deals</p>
		</div>
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
			<p class="text-xs text-amber-700 dark:text-amber-400">Upside</p>
			<p class="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(upsideTotal)}</p>
			<p class="text-[10px] text-amber-600/70 dark:text-amber-400/60">Best Case + {data.categorySummary.upside.count} deals</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<p class="text-xs text-surface-500">Pipeline Total</p>
			<p class="mt-1 text-xl font-bold text-surface-900 dark:text-surface-100">{formatCurrency(pipelineTotal)}</p>
			<p class="text-[10px] text-surface-500">All open in {data.periodLabel}</p>
		</div>
	</div>

	<!-- Forecast Table -->
	<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Forecast — {data.periodLabel}</h2>
		{#if data.forecastDeals.length === 0}
			<p class="py-8 text-center text-sm text-surface-500">No deals expected to close in this period.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-surface-200 dark:border-surface-800">
							<th class="pb-2 pr-4 font-medium text-surface-500">Deal</th>
							<th class="pb-2 pr-4 font-medium text-surface-500">Company</th>
							<th class="pb-2 pr-4 font-medium text-surface-500">Owner</th>
							<th class="pb-2 pr-4 text-right font-medium text-surface-500">Value</th>
							<th class="pb-2 pr-4 text-right font-medium text-surface-500">Prob</th>
							<th class="pb-2 pr-4 font-medium text-surface-500">Close</th>
							<th class="pb-2 pr-4 font-medium text-surface-500">Category</th>
							<th class="pb-2 text-right font-medium text-surface-500">Weighted</th>
						</tr>
					</thead>
					<tbody>
						{#each categories as cat}
							{@const deals = groupedDeals()[cat]}
							{#if deals && deals.length > 0}
								<!-- Category header -->
								<tr>
									<td colspan="8" class="pb-1 pt-3">
										<div class="flex items-center gap-2">
											<ForecastCategoryBadge category={cat} />
											<span class="text-[10px] text-surface-500">
												{deals.length} deals &middot; {formatCurrency(deals.reduce((a, d) => a + (d.value || 0), 0))}
												&middot; Weighted: {formatCurrency(deals.reduce((a, d) => a + d.weightedValue, 0))}
											</span>
										</div>
									</td>
								</tr>
								{#each deals as deal}
									<tr class="border-b border-surface-100 dark:border-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800/30">
										<td class="py-2 pr-4">
											<a href="/crm/opportunities/{deal.id}" class="font-medium text-brand-600 hover:underline dark:text-brand-400">
												{deal.title}
											</a>
										</td>
										<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{deal.companyName}</td>
										<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">{deal.ownerName || '—'}</td>
										<td class="py-2 pr-4 text-right font-medium text-surface-900 dark:text-surface-100">
											{deal.value ? formatCurrency(deal.value, deal.currency) : '—'}
										</td>
										<td class="py-2 pr-4 text-right text-surface-700 dark:text-surface-300">{deal.effectiveProbability}%</td>
										<td class="py-2 pr-4 text-surface-700 dark:text-surface-300">
											{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
										</td>
										<td class="py-2 pr-4">
											<select
												value={deal.forecastCategory || ''}
												onchange={(e) => updateCategory(deal.id, (e.target as HTMLSelectElement).value)}
												class="rounded border border-surface-300 bg-transparent px-1.5 py-0.5 text-[11px] text-surface-700 dark:border-surface-700 dark:text-surface-300"
											>
												<option value="">Auto</option>
												{#each categories as c}
													<option value={c}>{forecastCategoryConfig[c].label}</option>
												{/each}
											</select>
										</td>
										<td class="py-2 text-right font-medium text-surface-900 dark:text-surface-100">
											{formatCurrency(deal.weightedValue)}
										</td>
									</tr>
								{/each}
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Rollup chart -->
	<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
		<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Forecast Rollup — Next 6 Months</h2>
		<StackedBarChart
			groups={rollupGroups}
			formatValue={(n) => formatCurrency(n)}
		/>
		<div class="mt-2 flex gap-4 justify-center">
			<div class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
				<span class="h-2.5 w-2.5 rounded-full" style="background-color: {forecastCategoryConfig.commit.color}"></span> Commit
			</div>
			<div class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
				<span class="h-2.5 w-2.5 rounded-full" style="background-color: {forecastCategoryConfig.best_case.color}"></span> Best Case
			</div>
			<div class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
				<span class="h-2.5 w-2.5 rounded-full" style="background-color: {forecastCategoryConfig.upside.color}"></span> Upside
			</div>
		</div>
	</div>

	<!-- Historical comparison -->
	{#if data.historicalByMonth.some((m) => m.value > 0)}
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h2 class="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">Closed Won — Last 6 Months</h2>
			<StackedBarChart
				groups={data.historicalByMonth.map((m) => ({
					label: m.label,
					segments: [{ value: m.value, color: '#22c55e', label: 'Won' }]
				}))}
				formatValue={(n) => formatCurrency(n)}
			/>
		</div>
	{/if}
</div>
