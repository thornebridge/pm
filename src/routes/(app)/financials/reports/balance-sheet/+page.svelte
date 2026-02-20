<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	let asOfDate = $state(new Date(parseInt(data.filters.asOf)).toISOString().split('T')[0]);

	function applyFilter() {
		const asOf = new Date(asOfDate + 'T23:59:59').getTime();
		goto(`/financials/reports/balance-sheet?asOf=${asOf}`);
	}

	const totalLiabilitiesAndEquity = $derived(
		data.report.totalLiabilities + data.report.totalEquity + data.report.netIncome
	);

	const isBalanced = $derived(data.report.totalAssets === totalLiabilitiesAndEquity);
</script>

<svelte:head>
	<title>Balance Sheet | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<div class="mb-4">
		<h1 class="text-xl font-semibold text-surface-100">Balance Sheet</h1>
		<p class="mt-1 text-sm text-surface-500">
			As of {new Date(parseInt(data.filters.asOf)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>

	<!-- Date Filter -->
	<div class="mb-6 flex items-end gap-3">
		<div>
			<label for="bsAsOf" class="mb-1 block text-xs text-surface-500">As of Date</label>
			<input
				id="bsAsOf"
				type="date"
				bind:value={asOfDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<button
			onclick={applyFilter}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Apply
		</button>
	</div>

	<!-- Assets -->
	<div class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-surface-100">Assets</h2>
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Balance</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.assets as account}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{account.accountNumber}</span>
								{account.name}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(account.balance)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t border-surface-700 bg-surface-900">
					<tr>
						<td class="px-4 py-2 font-semibold text-surface-100">Total Assets</td>
						<td class="px-4 py-2 text-right font-semibold text-surface-100">{fmt(data.report.totalAssets)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Liabilities -->
	<div class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-surface-100">Liabilities</h2>
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Balance</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.liabilities as account}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{account.accountNumber}</span>
								{account.name}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(account.balance)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot class="border-t border-surface-700 bg-surface-900">
					<tr>
						<td class="px-4 py-2 font-semibold text-surface-100">Total Liabilities</td>
						<td class="px-4 py-2 text-right font-semibold text-surface-100">{fmt(data.report.totalLiabilities)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Equity + Net Income -->
	<div class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-surface-100">Equity & Net Income</h2>
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Account</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Balance</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.equity as account}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{account.accountNumber}</span>
								{account.name}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(account.balance)}</td>
						</tr>
					{/each}
					<tr class="border-b border-surface-800">
						<td class="px-4 py-2.5 text-surface-100 italic">Net Income (Retained Earnings)</td>
						<td class="px-4 py-2.5 text-right {data.report.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}">
							{fmt(data.report.netIncome)}
						</td>
					</tr>
				</tbody>
				<tfoot class="border-t border-surface-700 bg-surface-900">
					<tr>
						<td class="px-4 py-2 font-semibold text-surface-100">Total Equity + Net Income</td>
						<td class="px-4 py-2 text-right font-semibold text-surface-100">
							{fmt(data.report.totalEquity + data.report.netIncome)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Accounting Equation Verification -->
	<div class="rounded-lg border p-4 {isBalanced ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium {isBalanced ? 'text-green-400' : 'text-red-400'}">
					Accounting Equation: Assets = Liabilities + Equity
				</p>
				<p class="mt-1 text-xs text-surface-500">
					{fmt(data.report.totalAssets)} = {fmt(data.report.totalLiabilities)} + {fmt(data.report.totalEquity + data.report.netIncome)}
				</p>
			</div>
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {isBalanced ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">
				{isBalanced ? 'Balanced' : 'Out of Balance'}
			</span>
		</div>
	</div>
</div>
