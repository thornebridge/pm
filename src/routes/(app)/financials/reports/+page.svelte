<script lang="ts">
	const reports = [
		{
			title: 'Profit & Loss',
			description: 'Revenue, expenses, and net income over a date range.',
			href: '/financials/reports/profit-loss'
		},
		{
			title: 'Balance Sheet',
			description: 'Assets, liabilities, and equity as of a specific date.',
			href: '/financials/reports/balance-sheet'
		},
		{
			title: 'Trial Balance',
			description: 'All account debits and credits to verify the books balance.',
			href: '/financials/reports/trial-balance'
		},
		{
			title: 'Cash Flow',
			description: 'Operating, investing, and financing cash movements.',
			href: '/financials/reports/cash-flow'
		},
		{
			title: 'General Ledger',
			description: 'Transaction-level detail with running balances per account.',
			href: '/financials/reports/general-ledger'
		},
		{
			title: 'Budget vs Actual',
			description: 'Compare budgeted amounts to actual spend with variance analysis.',
			href: '/financials/reports/budget-vs-actual'
		}
	];
</script>

<svelte:head>
	<title>Financial Reports</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-xl font-semibold text-surface-100">Financial Reports</h1>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each reports as report}
			<a
				href={report.href}
				class="group rounded-lg border border-surface-800 bg-surface-900 p-5 transition hover:border-surface-700 hover:bg-surface-800"
			>
				<h2 class="text-base font-semibold text-surface-100 group-hover:text-white">
					{report.title}
				</h2>
				<p class="mt-2 text-sm text-surface-500">{report.description}</p>
				<span class="mt-3 inline-block text-xs font-medium text-brand-600 group-hover:text-brand-500">
					View Report &rarr;
				</span>
			</a>
		{/each}
	</div>
</div>
