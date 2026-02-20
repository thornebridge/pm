<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	let fromDate = $state(new Date(parseInt(data.filters.from)).toISOString().split('T')[0]);
	let toDate = $state(new Date(parseInt(data.filters.to)).toISOString().split('T')[0]);

	function applyFilters() {
		const from = new Date(fromDate).getTime();
		const to = new Date(toDate + 'T23:59:59').getTime();
		goto(`/financials/reports/cash-flow?from=${from}&to=${to}`);
	}

	const sections = $derived([
		{
			title: 'Operating Activities',
			value: data.report.operating,
			description: 'Cash from revenue and expense activity'
		},
		{
			title: 'Investing Activities',
			value: data.report.investing,
			description: 'Cash from fixed asset purchases and sales'
		},
		{
			title: 'Financing Activities',
			value: data.report.financing,
			description: 'Cash from equity and debt activity'
		}
	]);
</script>

<svelte:head>
	<title>Cash Flow | Financial Reports</title>
</svelte:head>

<div class="p-6">
	<div class="mb-2">
		<a href="/financials/reports" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reports</a>
	</div>
	<h1 class="mb-4 text-xl font-semibold text-surface-100">Cash Flow Statement</h1>

	<!-- Date Range Filter -->
	<div class="mb-6 flex flex-wrap items-end gap-3">
		<div>
			<label for="cfFrom" class="mb-1 block text-xs text-surface-500">From</label>
			<input
				id="cfFrom"
				type="date"
				bind:value={fromDate}
				class="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
			/>
		</div>
		<div>
			<label for="cfTo" class="mb-1 block text-xs text-surface-500">To</label>
			<input
				id="cfTo"
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

	<!-- Beginning Cash -->
	<div class="mb-6 rounded-lg border border-surface-800 bg-surface-900 p-4">
		<div class="flex items-center justify-between">
			<span class="text-sm text-surface-300">Beginning Cash Balance</span>
			<span class="text-lg font-semibold text-surface-100">{fmt(data.report.beginningCash)}</span>
		</div>
	</div>

	<!-- Cash Flow Sections -->
	<div class="mb-6 space-y-4">
		{#each sections as section}
			<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-base font-semibold text-surface-100">{section.title}</h2>
						<p class="mt-0.5 text-xs text-surface-500">{section.description}</p>
					</div>
					<span class="text-lg font-semibold {section.value >= 0 ? 'text-green-400' : 'text-red-400'}">
						{fmt(section.value)}
					</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Net Change -->
	<div class="mb-4 rounded-lg border border-surface-800 bg-surface-900 p-4">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-surface-300">Net Change in Cash</span>
			<span class="text-lg font-bold {data.report.netChange >= 0 ? 'text-green-400' : 'text-red-400'}">
				{fmt(data.report.netChange)}
			</span>
		</div>
	</div>

	<!-- Ending Cash -->
	<div class="rounded-lg border-2 border-surface-700 bg-surface-900 p-4">
		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-surface-100">Ending Cash Balance</span>
			<span class="text-xl font-bold text-surface-100">{fmt(data.report.endingCash)}</span>
		</div>
	</div>
</div>
