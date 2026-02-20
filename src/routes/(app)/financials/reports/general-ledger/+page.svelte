<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	let selectedAccount = $state(data.filters.accountId);
	let fromDate = $state(new Date(parseInt(data.filters.from)).toISOString().split('T')[0]);
	let toDate = $state(new Date(parseInt(data.filters.to)).toISOString().split('T')[0]);

	function applyFilters() {
		if (!selectedAccount) return;
		const from = new Date(fromDate).getTime();
		const to = new Date(toDate + 'T23:59:59').getTime();
		goto(`/financials/reports/general-ledger?accountId=${selectedAccount}&from=${from}&to=${to}`);
	}
</script>

<svelte:head>
	<title>General Ledger | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<h1 class="mb-4 text-xl font-semibold text-surface-100">General Ledger</h1>

	<!-- Filters -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div>
			<label for="glAccount" class="mb-1 block text-xs text-surface-500">Account</label>
			<select
				id="glAccount"
				bind:value={selectedAccount}
				class="w-64 rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			>
				<option value="">Select account...</option>
				{#each data.accounts as account}
					<option value={account.id}>{account.accountNumber} - {account.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="glFrom" class="mb-1 block text-xs text-surface-500">From</label>
			<input
				id="glFrom"
				type="date"
				bind:value={fromDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<div>
			<label for="glTo" class="mb-1 block text-xs text-surface-500">To</label>
			<input
				id="glTo"
				type="date"
				bind:value={toDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<button
			onclick={applyFilters}
			disabled={!selectedAccount}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed"
		>
			View Ledger
		</button>
	</div>

	{#if !data.report}
		<p class="text-sm text-surface-500">Select an account to view its general ledger.</p>
	{:else if data.report.entries && data.report.entries.length === 0}
		<p class="text-sm text-surface-500">No transactions found for this account in the selected date range.</p>
	{:else if data.report.entries}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Debit</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Credit</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Balance</th>
					</tr>
				</thead>
				<tbody>
					{#each data.report.entries as entry}
						<tr class="border-b border-surface-800">
							<td class="px-4 py-2.5 text-surface-300">{formatDate(entry.date)}</td>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{entry.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-100">{entry.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{entry.debit > 0 ? fmt(entry.debit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{entry.credit > 0 ? fmt(entry.credit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right font-medium {entry.balance >= 0 ? 'text-surface-100' : 'text-red-400'}">
								{fmt(entry.balance)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
