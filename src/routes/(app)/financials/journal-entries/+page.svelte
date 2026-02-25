<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let statusFilter = $state(data.filters.status);
	let search = $state(data.filters.q);
	let fromDate = $state(data.filters.from ? new Date(parseInt(data.filters.from)).toISOString().split('T')[0] : '');
	let toDate = $state(data.filters.to ? new Date(parseInt(data.filters.to)).toISOString().split('T')[0] : '');

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

	function applyFilters() {
		const params = new URLSearchParams();
		if (statusFilter) params.set('status', statusFilter);
		if (search) params.set('q', search);
		if (fromDate) params.set('from', String(new Date(fromDate).getTime()));
		if (toDate) params.set('to', String(new Date(toDate + 'T23:59:59').getTime()));
		goto(`/financials/journal-entries?${params.toString()}`);
	}

	function clearFilters() {
		statusFilter = '';
		search = '';
		fromDate = '';
		toDate = '';
		goto('/financials/journal-entries');
	}

	const hasMore = $derived(data.offset + data.limit < data.total);
	const hasPrev = $derived(data.offset > 0);

	function nextPage() {
		const params = new URLSearchParams(window.location.search);
		params.set('offset', String(data.offset + data.limit));
		goto(`/financials/journal-entries?${params.toString()}`);
	}

	function prevPage() {
		const params = new URLSearchParams(window.location.search);
		const newOffset = Math.max(0, data.offset - data.limit);
		params.set('offset', String(newOffset));
		goto(`/financials/journal-entries?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Journal Entries | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-surface-100">Journal Entries</h1>
		<a
			href="/financials/journal-entries/new"
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			New Entry
		</a>
	</div>

	<!-- Filter bar -->
	<div class="mb-4 flex flex-wrap items-end gap-3">
		<div>
			<label for="jeSearch" class="mb-1 block text-xs text-surface-500">Search</label>
			<input
				id="jeSearch"
				type="text"
				bind:value={search}
				placeholder="Description..."
				class="w-48 rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
			/>
		</div>
		<div>
			<label for="jeStatus" class="mb-1 block text-xs text-surface-500">Status</label>
			<select
				id="jeStatus"
				bind:value={statusFilter}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			>
				<option value="">All</option>
				<option value="draft">Draft</option>
				<option value="posted">Posted</option>
				<option value="voided">Voided</option>
			</select>
		</div>
		<div>
			<label for="jeFrom" class="mb-1 block text-xs text-surface-500">From</label>
			<input
				id="jeFrom"
				type="date"
				bind:value={fromDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<div>
			<label for="jeTo" class="mb-1 block text-xs text-surface-500">To</label>
			<input
				id="jeTo"
				type="date"
				bind:value={toDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<button
			onclick={applyFilters}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Filter
		</button>
		<button
			onclick={clearFilters}
			class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
		>
			Clear
		</button>
	</div>

	<!-- Results count -->
	<p class="mb-3 text-xs text-surface-500">
		Showing {data.entries.length} of {data.total} entries
	</p>

	{#if data.entries.length === 0}
		<p class="text-sm text-surface-500">No journal entries found.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Debits</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Credits</th>
						<th class="px-4 py-2 font-medium text-surface-300">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry (entry.id)}
						{@const totalDebits = entry.lines.reduce((sum, l) => sum + l.debit, 0)}
						{@const totalCredits = entry.lines.reduce((sum, l) => sum + l.credit, 0)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/journal-entries/${entry.id}`)}
						>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{entry.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(entry.date)}</td>
							<td class="px-4 py-2.5 text-surface-100">{entry.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{formatCents(totalDebits)}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{formatCents(totalCredits)}</td>
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

		<!-- Pagination -->
		{#if hasPrev || hasMore}
			<div class="mt-4 flex items-center justify-between">
				<button
					onclick={prevPage}
					disabled={!hasPrev}
					class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Previous
				</button>
				<span class="text-xs text-surface-500">
					{data.offset + 1}&ndash;{Math.min(data.offset + data.limit, data.total)} of {data.total}
				</span>
				<button
					onclick={nextPage}
					disabled={!hasMore}
					class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>
