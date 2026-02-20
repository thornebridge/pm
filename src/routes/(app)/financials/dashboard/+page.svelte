<script lang="ts">
	let { data } = $props();

	function formatCents(val: number): string {
		const abs = Math.abs(val);
		return `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, '0')}`;
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'posted':
				return 'bg-green-900/30 text-green-400';
			case 'draft':
				return 'bg-yellow-900/30 text-yellow-400';
			case 'voided':
				return 'bg-red-900/30 text-red-400';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	const netIncome = $derived(data.revenueMTD - data.expensesMTD);

	const cards = $derived([
		{
			title: 'Cash Balance',
			value: data.cashBalance,
			color: data.cashBalance >= 0 ? 'text-green-400' : 'text-red-400'
		},
		{
			title: 'Accounts Receivable',
			value: data.arBalance,
			color: 'text-blue-400'
		},
		{
			title: 'Accounts Payable',
			value: data.apBalance,
			color: 'text-orange-400'
		},
		{
			title: 'Revenue (MTD)',
			value: data.revenueMTD,
			color: 'text-green-400'
		},
		{
			title: 'Expenses (MTD)',
			value: data.expensesMTD,
			color: 'text-red-400'
		},
		{
			title: 'Net Income (MTD)',
			value: netIncome,
			color: netIncome >= 0 ? 'text-green-400' : 'text-red-400'
		}
	]);
</script>

<svelte:head>
	<title>Financial Dashboard</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-xl font-semibold text-surface-100">Financial Dashboard</h1>

	<!-- Summary Cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card}
			<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
				<p class="text-sm text-surface-500">{card.title}</p>
				<p class="mt-1 text-2xl font-bold {card.color}">
					{card.value < 0 ? '-' : ''}{formatCents(card.value)}
				</p>
			</div>
		{/each}
	</div>

	<!-- Recent Journal Entries -->
	<h2 class="mb-3 text-base font-semibold text-surface-100">Recent Journal Entries</h2>

	{#if data.recentEntries.length === 0}
		<p class="text-sm text-surface-500">No journal entries yet.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Amount</th>
						<th class="px-4 py-2 font-medium text-surface-300">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentEntries as entry (entry.id)}
						{@const totalDebits = entry.lines.reduce((sum, l) => sum + l.debit, 0)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/journal-entries/${entry.id}`)}
						>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{entry.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(entry.date)}</td>
							<td class="px-4 py-2.5 text-surface-100">{entry.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{formatCents(totalDebits)}</td>
							<td class="px-4 py-2.5">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {statusClass(entry.status)}"
								>
									{entry.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
