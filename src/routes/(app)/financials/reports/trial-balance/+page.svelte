<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	// svelte-ignore state_referenced_locally
	let fromDate = $state(new Date(parseInt(data.filters.from)).toISOString().split('T')[0]);
	let toDate = $state(new Date(parseInt(data.filters.to)).toISOString().split('T')[0]);

	function applyFilters() {
		const from = new Date(fromDate).getTime();
		const to = new Date(toDate + 'T23:59:59').getTime();
		goto(`/financials/reports/trial-balance?from=${from}&to=${to}`);
	}

	const isBalanced = $derived(data.report.totalDebits === data.report.totalCredits);

	// Filter out accounts with no activity
	const activeAccounts = $derived(
		data.report.accounts.filter((a: { debit: number; credit: number }) => a.debit > 0 || a.credit > 0)
	);
</script>

<svelte:head>
	<title>Trial Balance | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<h1 class="mb-4 text-xl font-semibold text-surface-100">Trial Balance</h1>

	<!-- Date Range Filter -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div>
			<label for="tbFrom" class="mb-1 block text-xs text-surface-500">From</label>
			<input
				id="tbFrom"
				type="date"
				bind:value={fromDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<div>
			<label for="tbTo" class="mb-1 block text-xs text-surface-500">To</label>
			<input
				id="tbTo"
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

	<div class="overflow-x-auto rounded-lg border border-surface-800">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-surface-800 bg-surface-900">
				<tr>
					<th class="px-4 py-2 font-medium text-surface-300">Account #</th>
					<th class="px-4 py-2 font-medium text-surface-300">Account Name</th>
					<th class="px-4 py-2 text-right font-medium text-surface-300">Debit</th>
					<th class="px-4 py-2 text-right font-medium text-surface-300">Credit</th>
				</tr>
			</thead>
			<tbody>
				{#each activeAccounts as account}
					<tr class="border-b border-surface-800">
						<td class="px-4 py-2.5 font-mono text-surface-300">{account.accountNumber}</td>
						<td class="px-4 py-2.5 text-surface-100">{account.name}</td>
						<td class="px-4 py-2.5 text-right text-surface-100">
							{account.debit > 0 ? fmt(account.debit) : ''}
						</td>
						<td class="px-4 py-2.5 text-right text-surface-100">
							{account.credit > 0 ? fmt(account.credit) : ''}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t-2 border-surface-700 bg-surface-900">
				<tr>
					<td class="px-4 py-2"></td>
					<td class="px-4 py-2 font-semibold text-surface-100">Totals</td>
					<td class="px-4 py-2 text-right font-semibold text-surface-100">{fmt(data.report.totalDebits)}</td>
					<td class="px-4 py-2 text-right font-semibold text-surface-100">{fmt(data.report.totalCredits)}</td>
				</tr>
				<tr>
					<td colspan="4" class="px-4 py-2 text-center">
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {isBalanced ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">
							{isBalanced ? 'Debits = Credits' : `Difference: ${fmt(data.report.totalDebits - data.report.totalCredits)}`}
						</span>
					</td>
				</tr>
			</tfoot>
		</table>
	</div>
</div>
