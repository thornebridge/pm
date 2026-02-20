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

	const isDebitNormal = $derived(data.account.normalBalance === 'debit');

	// Compute running balance for the activity table
	const activityWithRunning = $derived.by(() => {
		let running = 0;
		return data.activity.map((line) => {
			if (isDebitNormal) {
				running += line.debit - line.credit;
			} else {
				running += line.credit - line.debit;
			}
			return { ...line, runningBalance: running };
		});
	});
</script>

<svelte:head>
	<title>{data.account.accountNumber} - {data.account.name} | Financials</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<a href="/financials/accounts" class="text-sm text-surface-500 hover:text-surface-300">&larr; Chart of Accounts</a>
		<h1 class="mt-1 text-xl font-semibold text-surface-100">
			{data.account.accountNumber} - {data.account.name}
		</h1>
	</div>

	<!-- Account Info -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-800 bg-surface-900 p-4 md:grid-cols-3 lg:grid-cols-6">
		<div>
			<p class="text-xs text-surface-500">Account Number</p>
			<p class="text-sm font-mono text-surface-100">{data.account.accountNumber}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Name</p>
			<p class="text-sm text-surface-100">{data.account.name}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Type</p>
			<p class="text-sm capitalize text-surface-100">{data.account.accountType}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Subtype</p>
			<p class="text-sm text-surface-100">{data.account.subtype ? data.account.subtype.replace(/_/g, ' ') : '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Normal Balance</p>
			<p class="text-sm capitalize text-surface-100">{data.account.normalBalance}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Status</p>
			<p class="text-sm">
				<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium {data.account.active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}">
					{data.account.active ? 'Active' : 'Inactive'}
				</span>
			</p>
		</div>
	</div>

	<!-- Current Balance -->
	<div class="mb-6 rounded-lg border border-surface-800 bg-surface-900 p-5">
		<p class="text-sm text-surface-500">Current Balance</p>
		<p class="mt-1 text-3xl font-bold {data.balance >= 0 ? 'text-green-400' : 'text-red-400'}">
			{data.balance < 0 ? '-' : ''}{formatCents(data.balance)}
		</p>
	</div>

	<!-- Activity Table -->
	<h2 class="mb-3 text-base font-semibold text-surface-100">Account Activity</h2>

	{#if data.activity.length === 0}
		<p class="text-sm text-surface-500">No posted activity for this account.</p>
	{:else}
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
					{#each activityWithRunning as line (line.lineId)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/journal-entries/${line.entryId}`)}
						>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(line.date)}</td>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{line.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-100">{line.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.debit > 0 ? formatCents(line.debit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.credit > 0 ? formatCents(line.credit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right font-medium {line.runningBalance >= 0 ? 'text-surface-100' : 'text-red-400'}">
								{line.runningBalance < 0 ? '-' : ''}{formatCents(line.runningBalance)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
