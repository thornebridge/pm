<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import StageBar from '$lib/components/crm/StageBar.svelte';
	import OpportunityForm from '$lib/components/crm/OpportunityForm.svelte';
	import OpportunityItemsTab from '$lib/components/crm/OpportunityItemsTab.svelte';
	import ProposalForm from '$lib/components/crm/ProposalForm.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let editProposal = $state<(typeof data.proposals)[0] | undefined>(undefined);
	let showProposalForm = $state(false);
	let tab = $state<'overview' | 'products' | 'contacts' | 'activities' | 'proposals' | 'tasks'>('overview');

	async function changeStage(newStageId: string) {
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ stageId: newStageId })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update stage', 'error');
		}
	}

	async function deleteOpp() {
		if (!confirm('Delete this opportunity?')) return;
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}`, { method: 'DELETE' });
			showToast('Opportunity deleted');
			goto('/crm/opportunities');
		} catch {
			showToast('Failed to delete opportunity', 'error');
		}
	}

	async function linkContact(contactId: string, role?: string) {
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}/contacts`, {
				method: 'POST',
				body: JSON.stringify({ contactId, role })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to link contact', 'error');
		}
	}

	async function unlinkContact(contactId: string) {
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}/contacts`, {
				method: 'DELETE',
				body: JSON.stringify({ contactId })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to unlink contact', 'error');
		}
	}

	function activityTypeIcon(type: string) {
		switch (type) {
			case 'call': return '\u{1F4DE}';
			case 'email': return '\u{2709}\u{FE0F}';
			case 'meeting': return '\u{1F4C5}';
			case 'note': return '\u{1F4DD}';
			default: return '\u{1F4CB}';
		}
	}

	function relativeTime(ts: number) {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(ts).toLocaleDateString();
	}

	function proposalStatusColor(status: string) {
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

	let linkContactId = $state('');
	const unlnkedCompanyContacts = $derived(
		data.companyContacts.filter(
			(c) => !data.linkedContacts.some((lc) => lc.contactId === c.id)
		)
	);
</script>

<svelte:head>
	<title>{data.opportunity.title} | Opportunities</title>
</svelte:head>

<div class="p-6">
	<!-- Stage bar -->
	<StageBar stages={data.stages} currentStageId={data.opportunity.stageId} onStageChange={changeStage} />

	<!-- Header -->
	<div class="mt-4 mb-6 flex items-start justify-between">
		<div>
			<a href="/crm/opportunities" class="text-sm text-surface-500 hover:text-surface-300">&larr; Opportunities</a>
			<h1 class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">{data.opportunity.title}</h1>
			<div class="mt-1 flex items-center gap-3 text-sm">
				<a href="/crm/companies/{data.company?.id}" class="text-brand-500 hover:underline">{data.company?.name}</a>
				{#if data.opportunity.value}
					<span class="font-medium text-surface-900 dark:text-surface-100">{formatCurrency(data.opportunity.value, data.opportunity.currency)}</span>
				{/if}
				<span class="capitalize text-surface-500">{data.opportunity.priority}</span>
			</div>
		</div>
		<div class="flex gap-2">
			<button onclick={() => (showEdit = true)} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				Edit
			</button>
			<button onclick={deleteOpp} class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
				Delete
			</button>
		</div>
	</div>

	<!-- Sidebar info -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 md:grid-cols-5">
		<div>
			<p class="text-xs text-surface-500">Stage</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.stage?.name}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Owner</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.owner?.name || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Probability</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.opportunity.probability ?? data.stage?.probability ?? 0}%</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Expected Close</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.opportunity.expectedCloseDate ? new Date(data.opportunity.expectedCloseDate).toLocaleDateString() : '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Source</p>
			<p class="text-sm capitalize text-surface-900 dark:text-surface-100">{data.opportunity.source || '\u2014'}</p>
		</div>
	</div>

	<!-- Lost reason -->
	{#if data.stage?.isClosed && !data.stage?.isWon && data.opportunity.lostReason}
		<div class="mb-6 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
			<p class="text-xs font-medium text-red-600 dark:text-red-400">Lost Reason</p>
			<p class="text-sm text-red-700 dark:text-red-300">{data.opportunity.lostReason}</p>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mb-4 flex gap-4 border-b border-surface-300 dark:border-surface-800">
		{#each [
			{ key: 'overview', label: 'Overview' },
			{ key: 'products', label: `Products (${data.opportunityItems.length})` },
			{ key: 'contacts', label: `Contacts (${data.linkedContacts.length})` },
			{ key: 'activities', label: `Activities (${data.activities.length})` },
			{ key: 'proposals', label: `Proposals (${data.proposals.length})` },
			{ key: 'tasks', label: `Tasks (${data.tasks.length})` }
		] as t}
			<button
				onclick={() => (tab = t.key as typeof tab)}
				class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === t.key ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	{#if tab === 'overview'}
		{#if data.opportunity.description}
			<div class="prose prose-sm dark:prose-invert max-w-none">
				<p class="whitespace-pre-wrap">{data.opportunity.description}</p>
			</div>
		{:else}
			<p class="text-sm text-surface-500">No description.</p>
		{/if}
	{/if}

	{#if tab === 'products'}
		<OpportunityItemsTab
			opportunityId={data.opportunity.id}
			items={data.opportunityItems}
			products={data.crmProducts}
		/>
	{/if}

	{#if tab === 'contacts'}
		{#if unlnkedCompanyContacts.length > 0}
			<div class="mb-4 flex items-center gap-2">
				<select bind:value={linkContactId} class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
					<option value="">Link a contact...</option>
					{#each unlnkedCompanyContacts as c}
						<option value={c.id}>{c.firstName} {c.lastName}</option>
					{/each}
				</select>
				<button
					onclick={() => { if (linkContactId) { linkContact(linkContactId); linkContactId = ''; } }}
					disabled={!linkContactId}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					Link
				</button>
			</div>
		{/if}
		{#if data.linkedContacts.length === 0}
			<p class="text-sm text-surface-500">No contacts linked to this opportunity.</p>
		{:else}
			<div class="space-y-2">
				{#each data.linkedContacts as contact (contact.contactId)}
					<div class="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
						<a href="/crm/contacts/{contact.contactId}" class="flex-1">
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
								{contact.firstName} {contact.lastName}
							</p>
							<div class="flex items-center gap-2 text-xs text-surface-500">
								{#if contact.title}<span>{contact.title}</span>{/if}
								{#if contact.role}<span class="capitalize rounded-full bg-surface-200 px-1.5 py-0.5 dark:bg-surface-800">{contact.role}</span>{/if}
							</div>
						</a>
						<button
							onclick={() => unlinkContact(contact.contactId)}
							class="text-xs text-red-500 hover:text-red-700"
						>
							Unlink
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'activities'}
		{#if data.activities.length === 0}
			<p class="text-sm text-surface-500">No activities yet.</p>
		{:else}
			<div class="space-y-3">
				{#each data.activities as activity (activity.id)}
					<div class="flex gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
						<span class="text-lg">{activityTypeIcon(activity.type)}</span>
						<div class="flex-1">
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{activity.subject}</p>
							{#if activity.description}
								<p class="mt-0.5 text-xs text-surface-600 dark:text-surface-400 line-clamp-2">{activity.description}</p>
							{/if}
							<p class="mt-1 text-[10px] text-surface-500">{activity.userName} &middot; {relativeTime(activity.createdAt)}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'proposals'}
		{#if data.proposals.length === 0}
			<p class="text-sm text-surface-500">No proposals yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.proposals as proposal (proposal.id)}
					<button
						onclick={() => { editProposal = proposal; showProposalForm = true; }}
						class="flex w-full items-center justify-between rounded-lg border border-surface-300 bg-surface-50 p-3 text-left hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:bg-surface-800"
					>
						<div>
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{proposal.title}</p>
							<div class="mt-0.5 flex items-center gap-2">
								<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white capitalize {proposalStatusColor(proposal.status)}">{proposal.status}</span>
								{#if proposal.amount}
									<span class="text-xs text-surface-500">{formatCurrency(proposal.amount)}</span>
								{/if}
							</div>
						</div>
						<span class="text-xs text-surface-500">{new Date(proposal.createdAt).toLocaleDateString()}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'tasks'}
		{#if data.tasks.length === 0}
			<p class="text-sm text-surface-500">No tasks yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.tasks as task (task.id)}
					<div class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900 {task.completedAt ? 'opacity-60' : ''}">
						<div class="flex-1">
							<p class="text-sm {task.completedAt ? 'line-through' : ''} text-surface-900 dark:text-surface-100">{task.title}</p>
							<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-500">
								{#if task.assigneeName}<span>{task.assigneeName}</span>{/if}
								{#if task.dueDate}<span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<OpportunityForm
	open={showEdit}
	onclose={() => (showEdit = false)}
	opportunity={data.opportunity}
	companies={data.crmCompanies}
	stages={data.stages}
	members={data.members}
/>

<ProposalForm
	open={showProposalForm}
	onclose={() => { showProposalForm = false; editProposal = undefined; }}
	opportunityId={data.opportunity.id}
	proposal={editProposal}
/>
