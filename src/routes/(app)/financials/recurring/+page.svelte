<script lang="ts">
	let { data } = $props();

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function statusBadge(status: string): string {
		switch (status) {
			case 'active':
				return 'bg-green-900/30 text-green-400';
			case 'paused':
				return 'bg-yellow-900/30 text-yellow-400';
			case 'cancelled':
				return 'bg-red-900/30 text-red-400';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	function frequencyLabel(freq: string): string {
		const labels: Record<string, string> = {
			daily: 'Daily',
			weekly: 'Weekly',
			biweekly: 'Bi-weekly',
			monthly: 'Monthly',
			quarterly: 'Quarterly',
			yearly: 'Yearly'
		};
		return labels[freq] || freq;
	}
</script>

<svelte:head>
	<title>Recurring Rules | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-surface-100">Recurring Rules</h1>
		<a
			href="/financials/recurring/new"
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Add Rule
		</a>
	</div>

	{#if data.rules.length === 0}
		<p class="text-sm text-surface-500">No recurring rules yet. Create one to automate journal entries.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Name</th>
						<th class="px-4 py-2 font-medium text-surface-300">Frequency</th>
						<th class="px-4 py-2 font-medium text-surface-300">Next Occurrence</th>
						<th class="px-4 py-2 font-medium text-surface-300">Auto-Post</th>
						<th class="px-4 py-2 font-medium text-surface-300">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.rules as rule (rule.id)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/recurring/${rule.id}`)}
						>
							<td class="px-4 py-2.5">
								<span class="font-medium text-surface-100">{rule.name}</span>
								{#if rule.description}
									<p class="mt-0.5 text-xs text-surface-500">{rule.description}</p>
								{/if}
							</td>
							<td class="px-4 py-2.5 text-surface-300">{frequencyLabel(rule.frequency)}</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(rule.nextOccurrence)}</td>
							<td class="px-4 py-2.5 text-surface-300">{rule.autoPost ? 'Yes' : 'No'}</td>
							<td class="px-4 py-2.5">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {statusBadge(rule.status)}"
								>
									{rule.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
