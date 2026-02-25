<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	function tsToDateStr(ts: string): string {
		return new Date(parseInt(ts)).toISOString().split('T')[0];
	}

	// svelte-ignore state_referenced_locally
	let fromDate = $state(tsToDateStr(data.filters.from));
	let toDate = $state(tsToDateStr(data.filters.to));

	function applyFilters() {
		const from = new Date(fromDate).getTime();
		const to = new Date(toDate + 'T23:59:59').getTime();
		goto(`/financials/reports/profit-loss?from=${from}&to=${to}`);
	}

	async function exportCsv() {
		const from = new Date(fromDate).getTime();
		const to = new Date(toDate + 'T23:59:59').getTime();
		const url = `/api/financials/reports/export/profit-loss?format=csv&from=${from}&to=${to}`;
		const res = await fetch(url);
		const blob = await res.blob();
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `profit-loss-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function formatDateRange(from: string, to: string): string {
		const f = new Date(parseInt(from));
		const t = new Date(parseInt(to));
		return `${f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	}
</script>

<svelte:head>
	<title>Profit & Loss | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-surface-100">Profit & Loss Statement</h1>
			<p class="mt-1 text-sm text-surface-500">{formatDateRange(data.filters.from, data.filters.to)}</p>
		</div>
		<button
			onclick={exportCsv}
			class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
		>
			Export CSV
		</button>
	</div>

	<!-- Date Range Filter -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div>
			<label for="plFrom" class="mb-1 block text-xs text-surface-500">From</label>
			<input
				id="plFrom"
				type="date"
				bind:value={fromDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<div>
			<label for="plTo" class="mb-1 block text-xs text-surface-500">To</label>
			<input
				id="plTo"
				type="date"
				bind:value={toDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<button
			onclick={applyFilters}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Apply
		</button>
	</div>

	<!-- Revenue Section -->
	<div class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-surface-100">Revenue</h2>
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.revenue as account}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{account.accountNumber}</span>
								{account.name}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(account.total)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t border-surface-700 bg-surface-900">
					<tr>
						<td class="px-4 py-2 font-semibold text-surface-100">Total Revenue</td>
						<td class="px-4 py-2 text-right font-semibold text-green-400">{fmt(data.report.totalRevenue)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Expense Section -->
	<div class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-surface-100">Expenses</h2>
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.expenses as account}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{account.accountNumber}</span>
								{account.name}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(account.total)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t border-surface-700 bg-surface-900">
					<tr>
						<td class="px-4 py-2 font-semibold text-surface-100">Total Expenses</td>
						<td class="px-4 py-2 text-right font-semibold text-red-400">{fmt(data.report.totalExpenses)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Net Income -->
	<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
		<div class="flex items-center justify-between">
			<span class="text-lg font-semibold text-surface-100">Net Income</span>
			<span class="text-lg font-bold {data.report.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}">
				{fmt(data.report.netIncome)}
			</span>
		</div>
	</div>
</div>
