<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import ProposalForm from '$lib/components/crm/ProposalForm.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let statusFilter = $state('');

	const filtered = $derived.by(() => {
		let list = data.proposals;
		if (statusFilter) list = list.filter((p) => p.status === statusFilter);
		return list;
	});

	function statusColor(status: string) {
		switch (status) {
			case 'draft': return 'bg-surface-400';
			case 'sent': return 'bg-blue-500';
			case 'viewed': return 'bg-indigo-500';
			case 'accepted': return 'bg-green-500';
			case 'rejected': return 'bg-red-500';
			case 'expired': return 'bg-amber-500';
			default: return 'bg-surface-400';
		}
	}

	async function updateStatus(proposalId: string, newStatus: string) {
		try {
			await api(`/api/crm/proposals/${proposalId}`, {
				method: 'PATCH',
				body: JSON.stringify({ status: newStatus })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update proposal', 'error');
		}
	}
</script>

<svelte:head>
	<title>Proposals</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Proposals</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
		>
			Create Proposal
		</button>
	</div>

	<div class="mb-4">
		<select
			bind:value={statusFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">All statuses</option>
			<option value="draft">Draft</option>
			<option value="sent">Sent</option>
			<option value="viewed">Viewed</option>
			<option value="accepted">Accepted</option>
			<option value="rejected">Rejected</option>
			<option value="expired">Expired</option>
		</select>
	</div>

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<p class="text-sm text-surface-500">No proposals yet.</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Title</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Opportunity</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Company</th>
						<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Amount</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Status</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Sent</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Expires</th>
						<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as proposal (proposal.id)}
						<tr class="border-b border-surface-200 dark:border-surface-800">
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">{proposal.title}</td>
							<td class="px-4 py-2.5">
								<a href="/crm/opportunities/{proposal.opportunityId}" class="text-brand-500 hover:underline">{proposal.opportunityTitle}</a>
							</td>
							<td class="px-4 py-2.5 text-surface-600 dark:text-surface-400">{proposal.companyName}</td>
							<td class="px-4 py-2.5 text-right font-medium text-surface-900 dark:text-surface-100">
								{proposal.amount ? formatCurrency(proposal.amount) : '\u2014'}
							</td>
							<td class="px-4 py-2.5">
								<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white capitalize {statusColor(proposal.status)}">{proposal.status}</span>
							</td>
							<td class="px-4 py-2.5 text-surface-500">
								{proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-surface-500">
								{proposal.expiresAt ? new Date(proposal.expiresAt).toLocaleDateString() : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-right">
								{#if proposal.status === 'draft'}
									<button onclick={() => updateStatus(proposal.id, 'sent')} class="text-xs text-blue-500 hover:underline">Mark Sent</button>
								{:else if proposal.status === 'sent'}
									<button onclick={() => updateStatus(proposal.id, 'accepted')} class="text-xs text-green-500 hover:underline">Accept</button>
									<button onclick={() => updateStatus(proposal.id, 'rejected')} class="ml-2 text-xs text-red-500 hover:underline">Reject</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<ProposalForm
	open={showForm}
	onclose={() => (showForm = false)}
/>
