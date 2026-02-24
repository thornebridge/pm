<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import StageBar from '$lib/components/crm/StageBar.svelte';
	import OpportunityForm from '$lib/components/crm/OpportunityForm.svelte';
	import OpportunityItemsTab from '$lib/components/crm/OpportunityItemsTab.svelte';
	import ProposalForm from '$lib/components/crm/ProposalForm.svelte';
	import CustomFieldsPanel from '$lib/components/crm/CustomFieldsPanel.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let editProposal = $state<(typeof data.proposals)[0] | undefined>(undefined);
	let showProposalForm = $state(false);
	let tab = $state<'overview' | 'products' | 'contacts' | 'activities' | 'emails' | 'proposals' | 'tasks'>('overview');

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

	async function updateContactRole(contactId: string, field: string, value: string | null) {
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}/contacts`, {
				method: 'PATCH',
				body: JSON.stringify({ contactId, [field]: value })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update contact', 'error');
		}
	}

	const roleOptions = ['Decision Maker', 'Economic Buyer', 'Technical Evaluator', 'Champion', 'End User', 'Influencer', 'Gatekeeper', 'Legal/Compliance'];

	function sentimentIcon(sentiment: string | null) {
		switch (sentiment) {
			case 'champion': return '\u{2B50}';
			case 'supportive': return '\u{1F44D}';
			case 'neutral': return '\u{1F610}';
			case 'skeptical': return '\u{1F914}';
			case 'blocker': return '\u{1F6D1}';
			default: return '';
		}
	}

	function sentimentColor(sentiment: string | null) {
		switch (sentiment) {
			case 'champion': return 'text-amber-500';
			case 'supportive': return 'text-green-500';
			case 'neutral': return 'text-surface-400';
			case 'skeptical': return 'text-orange-500';
			case 'blocker': return 'text-red-500';
			default: return 'text-surface-400';
		}
	}

	function influenceColor(influence: string | null) {
		switch (influence) {
			case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
			case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
			case 'low': return 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400';
			default: return '';
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

	// Next step inline editing
	let editingNextStep = $state(false);
	let nextStepText = $state(data.opportunity.nextStep || '');
	let nextStepDueDateStr = $state(
		data.opportunity.nextStepDueDate
			? new Date(data.opportunity.nextStepDueDate).toISOString().split('T')[0]
			: ''
	);

	$effect(() => {
		nextStepText = data.opportunity.nextStep || '';
		nextStepDueDateStr = data.opportunity.nextStepDueDate
			? new Date(data.opportunity.nextStepDueDate).toISOString().split('T')[0]
			: '';
	});

	async function saveNextStep() {
		try {
			await api(`/api/crm/opportunities/${data.opportunity.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					nextStep: nextStepText.trim() || null,
					nextStepDueDate: nextStepDueDateStr ? new Date(nextStepDueDateStr).getTime() : null
				})
			});
			editingNextStep = false;
			await invalidateAll();
		} catch {
			showToast('Failed to update next step', 'error');
		}
	}

	function nextStepStatusColor(status: string) {
		switch (status) {
			case 'overdue': return 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
			case 'due_soon': return 'border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';
			case 'on_track': return 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
			default: return 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-900';
		}
	}

	function healthColor(isStale: boolean, isAging: boolean) {
		if (isStale) return 'text-red-500';
		if (isAging) return 'text-amber-500';
		return 'text-green-500';
	}
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

	<!-- Next Step -->
	{#if !data.stage?.isClosed}
		<div class="mb-4 rounded-lg border p-3 {nextStepStatusColor(data.dealHealth.nextStepStatus)}">
			{#if editingNextStep}
				<div class="flex items-start gap-2">
					<div class="flex-1 space-y-2">
						<input
							bind:value={nextStepText}
							placeholder="What's the next step? e.g. 'Send pricing proposal'"
							class="w-full rounded-md border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
						<input
							type="date"
							bind:value={nextStepDueDateStr}
							class="rounded-md border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</div>
					<button onclick={saveNextStep} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">Save</button>
					<button onclick={() => { editingNextStep = false; nextStepText = data.opportunity.nextStep || ''; }} class="rounded-md px-3 py-1.5 text-sm text-surface-500 hover:text-surface-700">Cancel</button>
				</div>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="flex items-center justify-between cursor-pointer" onclick={() => (editingNextStep = true)}>
					<div class="flex items-center gap-2">
						<span class="text-xs font-medium text-surface-500 uppercase tracking-wide">Next Step</span>
						{#if data.opportunity.nextStep}
							<span class="text-sm text-surface-900 dark:text-surface-100">{data.opportunity.nextStep}</span>
						{:else}
							<span class="text-sm italic text-surface-400">Click to set next step...</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						{#if data.opportunity.nextStepDueDate}
							<span class="text-xs {data.dealHealth.nextStepStatus === 'overdue' ? 'text-red-600 font-medium dark:text-red-400' : data.dealHealth.nextStepStatus === 'due_soon' ? 'text-amber-600 dark:text-amber-400' : 'text-surface-500'}">
								Due {new Date(data.opportunity.nextStepDueDate).toLocaleDateString()}
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Deal info + health -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 md:grid-cols-7">
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
		<div>
			<p class="text-xs text-surface-500">Days in Stage</p>
			<p class="text-sm font-medium {healthColor(false, (data.dealHealth.daysInStage ?? 0) >= 14)}">
				{data.dealHealth.daysInStage !== null ? data.dealHealth.daysInStage : '\u2014'}
			</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Last Activity</p>
			<p class="text-sm font-medium {healthColor(data.dealHealth.isStale, data.dealHealth.isAging)}">
				{#if data.dealHealth.daysSinceLastActivity !== null}
					{data.dealHealth.daysSinceLastActivity === 0 ? 'Today' : `${data.dealHealth.daysSinceLastActivity}d ago`}
				{:else}
					None
				{/if}
			</p>
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
			{ key: 'contacts', label: `Stakeholders (${data.linkedContacts.length})` },
			{ key: 'activities', label: `Activities (${data.activities.length})` },
			{ key: 'emails', label: `Emails (${data.emails.length})` },
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
			<div class="prose prose-sm dark:prose-invert max-w-none mb-6">
				<p class="whitespace-pre-wrap">{data.opportunity.description}</p>
			</div>
		{:else}
			<p class="text-sm text-surface-500 mb-6">No description.</p>
		{/if}

		<!-- Custom Fields -->
		<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">Custom Fields</h3>
			<CustomFieldsPanel entityType="opportunity" entityId={data.opportunity.id} />
		</div>
	{/if}

	{#if tab === 'products'}
		<OpportunityItemsTab
			opportunityId={data.opportunity.id}
			items={data.opportunityItems}
			products={data.crmProducts}
		/>
	{/if}

	{#if tab === 'contacts'}
		<!-- Buying Committee Header -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Buying Committee</h3>
				{#if data.linkedContacts.length > 0}
					<p class="mt-0.5 text-xs text-surface-500">
						{data.linkedContacts.length} stakeholder{data.linkedContacts.length !== 1 ? 's' : ''}
						{#if data.linkedContacts.some(c => c.sentiment === 'champion')}
							&middot; {data.linkedContacts.filter(c => c.sentiment === 'champion').length} Champion{data.linkedContacts.filter(c => c.sentiment === 'champion').length !== 1 ? 's' : ''}
						{/if}
						{#if data.linkedContacts.some(c => c.sentiment === 'blocker')}
							&middot; <span class="text-red-500">{data.linkedContacts.filter(c => c.sentiment === 'blocker').length} Blocker{data.linkedContacts.filter(c => c.sentiment === 'blocker').length !== 1 ? 's' : ''}</span>
						{/if}
					</p>
				{/if}
			</div>
			{#if unlnkedCompanyContacts.length > 0}
				<div class="flex items-center gap-2">
					<select bind:value={linkContactId} class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						<option value="">Add stakeholder...</option>
						{#each unlnkedCompanyContacts as c}
							<option value={c.id}>{c.firstName} {c.lastName}</option>
						{/each}
					</select>
					<button
						onclick={() => { if (linkContactId) { linkContact(linkContactId); linkContactId = ''; } }}
						disabled={!linkContactId}
						class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
					>
						Add
					</button>
				</div>
			{/if}
		</div>

		{#if data.linkedContacts.length === 0}
			<p class="text-sm text-surface-500">No stakeholders mapped yet. Add contacts from this company to build the buying committee.</p>
		{:else}
			<div class="space-y-3">
				{#each data.linkedContacts as contact (contact.contactId)}
					<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
						<div class="flex items-start justify-between">
							<a href="/crm/contacts/{contact.contactId}" class="flex-1">
								<div class="flex items-center gap-2">
									{#if contact.sentiment}
										<span class="{sentimentColor(contact.sentiment)}" title={contact.sentiment}>{sentimentIcon(contact.sentiment)}</span>
									{/if}
									<p class="text-sm font-medium text-surface-900 dark:text-surface-100">
										{contact.firstName} {contact.lastName}
									</p>
									{#if contact.influence}
										<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize {influenceColor(contact.influence)}">{contact.influence}</span>
									{/if}
								</div>
								{#if contact.title}
									<p class="mt-0.5 text-xs text-surface-500">{contact.title}</p>
								{/if}
							</a>
							<button
								onclick={() => unlinkContact(contact.contactId)}
								class="text-xs text-red-500 hover:text-red-700"
							>
								Remove
							</button>
						</div>

						<!-- Inline field editing -->
						<div class="mt-3 grid grid-cols-3 gap-2">
							<div>
								<label class="mb-0.5 block text-[10px] text-surface-400 uppercase tracking-wide">Role</label>
								<select
									value={contact.role || ''}
									onchange={(e) => updateContactRole(contact.contactId, 'role', (e.target as HTMLSelectElement).value || null)}
									class="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								>
									<option value="">--</option>
									{#each roleOptions as r}
										<option value={r}>{r}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="mb-0.5 block text-[10px] text-surface-400 uppercase tracking-wide">Influence</label>
								<select
									value={contact.influence || ''}
									onchange={(e) => updateContactRole(contact.contactId, 'influence', (e.target as HTMLSelectElement).value || null)}
									class="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								>
									<option value="">--</option>
									<option value="high">High</option>
									<option value="medium">Medium</option>
									<option value="low">Low</option>
								</select>
							</div>
							<div>
								<label class="mb-0.5 block text-[10px] text-surface-400 uppercase tracking-wide">Sentiment</label>
								<select
									value={contact.sentiment || ''}
									onchange={(e) => updateContactRole(contact.contactId, 'sentiment', (e.target as HTMLSelectElement).value || null)}
									class="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								>
									<option value="">--</option>
									<option value="champion">Champion</option>
									<option value="supportive">Supportive</option>
									<option value="neutral">Neutral</option>
									<option value="skeptical">Skeptical</option>
									<option value="blocker">Blocker</option>
								</select>
							</div>
						</div>
						{#if contact.notes}
							<p class="mt-2 text-xs text-surface-500 italic">{contact.notes}</p>
						{/if}
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

	{#if tab === 'emails'}
		{#if data.emails.length === 0}
			<p class="text-sm text-surface-500">No linked emails yet.</p>
		{:else}
			<div class="space-y-2">
				{#each data.emails as email (email.id)}
					<a
						href="/crm/email"
						class="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 p-3 transition hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:hover:bg-surface-800/50"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								{#if !email.isRead}
									<div class="h-2 w-2 shrink-0 rounded-full bg-brand-500"></div>
								{/if}
								<p class="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{email.subject}</p>
								{#if email.messageCount > 1}
									<span class="shrink-0 rounded bg-surface-200 px-1 text-[10px] text-surface-600 dark:bg-surface-800 dark:text-surface-400">{email.messageCount}</span>
								{/if}
							</div>
							<p class="mt-0.5 truncate text-xs text-surface-500">{email.snippet || ''}</p>
						</div>
						<span class="ml-2 shrink-0 text-[10px] text-surface-500">
							{new Date(email.lastMessageAt).toLocaleDateString()}
						</span>
					</a>
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
