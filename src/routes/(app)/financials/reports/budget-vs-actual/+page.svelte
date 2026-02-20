<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	let year = $state(data.filters.year);
	let periodType = $state(data.filters.periodType);

	function applyFilters() {
		goto(`/financials/reports/budget-vs-actual?year=${year}&periodType=${periodType}`);
	}

	function progressColor(pct: number): string {
		if (pct > 100) return 'bg-red-500';
		if (pct > 80) return 'bg-yellow-500';
		return 'bg-green-500';
	}

	function varianceColor(variance: number): string {
		if (variance < 0) return 'text-red-400';
		if (variance > 0) return 'text-green-400';
		return 'text-surface-300';
	}

	function formatPeriod(start: number): string {
		return new Date(start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
</script>

<svelte:head>
	<title>Budget vs Actual | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<h1 class="mb-4 text-xl font-semibold text-surface-100">Budget vs Actual</h1>

	<!-- Filters -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div>
			<label for="bvaYear" class="mb-1 block text-xs text-surface-500">Year</label>
			<select
				id="bvaYear"
				bind:value={year}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			>
				{#each yearOptions as y}
					<option value={String(y)}>{y}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="bvaPeriod" class="mb-1 block text-xs text-surface-500">Period Type</label>
			<select
				id="bvaPeriod"
				bind:value={periodType}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			>
				<option value="monthly">Monthly</option>
				<option value="quarterly">Quarterly</option>
				<option value="yearly">Yearly</option>
			</select>
		</div>
		<button
			onclick={applyFilters}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Apply
		</button>
	</div>

	{#if data.report.items && data.report.items.length === 0}
		<p class="text-sm text-surface-500">No budget data found for {year}. Create budgets first.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 font-medium text-surface-300">Period</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Budgeted</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Actual</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Variance</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">% Used</th>
						<th class="w-36 px-4 py-2 font-medium text-surface-300">Progress</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.items as item}
						{@const pctClamped = Math.min(item.percentUsed, 100)}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{item.accountNumber}</span>
								{item.name}
							</td>
							<td class="px-4 py-2.5 text-surface-300">{formatPeriod(item.periodStart)}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(item.budgeted)}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(item.actual)}</td>
							<td class="px-4 py-2.5 text-right {varianceColor(item.variance)}">{fmt(item.variance)}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{item.percentUsed.toFixed(1)}%</td>
							<td class="px-4 py-2.5">
								<div class="h-2 w-full rounded-full bg-surface-700">
									<div
										class="h-2 rounded-full transition-all {progressColor(item.percentUsed)}"
										style="width: {pctClamped}%"
									></div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
