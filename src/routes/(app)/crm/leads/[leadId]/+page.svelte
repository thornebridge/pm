<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import LeadForm from '$lib/components/crm/LeadForm.svelte';
	import LeadStatusBadge from '$lib/components/crm/LeadStatusBadge.svelte';
	import LeadConvertModal from '$lib/components/crm/LeadConvertModal.svelte';
	import CustomFieldsPanel from '$lib/components/crm/CustomFieldsPanel.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let showConvert = $state(false);
	let tab = $state<'details' | 'activities'>('details');

	const isConverted = $derived(!!data.lead.convertedAt);

	async function deleteLead() {
		if (!confirm('Delete this lead?')) return;
		try {
			await api(`/api/crm/leads/${data.lead.id}`, { method: 'DELETE' });
			showToast('Lead deleted');
			goto('/crm/leads');
		} catch {
			showToast('Failed to delete lead', 'error');
		}
	}

	async function updateStatus(newStatusId: string) {
		try {
			await api(`/api/crm/leads/${data.lead.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ statusId: newStatusId })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update status', 'error');
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
</script>

<svelte:head>
	<title>{data.lead.firstName} {data.lead.lastName} | Leads</title>
</svelte:head>

<div class="p-6">
	{#if isConverted}
		<div class="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
			<p class="text-sm font-medium text-green-800 dark:text-green-300">
				This lead was converted on {new Date(data.lead.convertedAt!).toLocaleDateString()}
			</p>
			<div class="mt-1 flex flex-wrap gap-3 text-sm">
				{#if data.convertedCompany}
					<a href="/crm/companies/{data.convertedCompany.id}" class="text-green-700 underline hover:text-green-900 dark:text-green-400">{data.convertedCompany.name}</a>
				{/if}
				{#if data.convertedContact}
					<a href="/crm/contacts/{data.convertedContact.id}" class="text-green-700 underline hover:text-green-900 dark:text-green-400">{data.convertedContact.firstName} {data.convertedContact.lastName}</a>
				{/if}
				{#if data.convertedOpportunity}
					<a href="/crm/opportunities/{data.convertedOpportunity.id}" class="text-green-700 underline hover:text-green-900 dark:text-green-400">{data.convertedOpportunity.title}</a>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<a href="/crm/leads" class="text-sm text-surface-500 hover:text-surface-300">&larr; Leads</a>
			<h1 class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">
				{data.lead.firstName} {data.lead.lastName}
			</h1>
			{#if data.lead.title}
				<p class="text-sm text-surface-500">{data.lead.title}</p>
			{/if}
			{#if data.lead.companyName}
				<p class="text-sm text-surface-600 dark:text-surface-400">{data.lead.companyName}</p>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if data.status}
				<select
					value={data.lead.statusId}
					onchange={(e) => updateStatus((e.target as HTMLSelectElement).value)}
					class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					disabled={isConverted}
				>
					{#each data.leadStatuses as s}
						<option value={s.id}>{s.name}</option>
					{/each}
				</select>
			{/if}
			{#if !isConverted}
				<button onclick={() => (showConvert = true)} class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500">
					Convert
				</button>
			{/if}
			<button onclick={() => (showEdit = true)} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				Edit
			</button>
			<button onclick={deleteLead} class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
				Delete
			</button>
		</div>
	</div>

	<!-- Info grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-200 p-4 text-sm dark:border-surface-800 sm:grid-cols-3">
		<div>
			<span class="text-xs text-surface-500">Email</span>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.email || '—'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Phone</span>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.phone || '—'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Source</span>
			<p class="capitalize text-surface-900 dark:text-surface-100">{data.lead.source?.replace('_', ' ') || '—'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Industry</span>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.industry || '—'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Company Size</span>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.companySize || '—'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Website</span>
			{#if data.lead.website}
				<a href={data.lead.website} target="_blank" class="text-brand-500 hover:underline">{data.lead.website}</a>
			{:else}
				<p class="text-surface-900 dark:text-surface-100">—</p>
			{/if}
		</div>
		<div>
			<span class="text-xs text-surface-500">Owner</span>
			<p class="text-surface-900 dark:text-surface-100">{data.owner?.name || 'Unassigned'}</p>
		</div>
		<div>
			<span class="text-xs text-surface-500">Status</span>
			{#if data.status}
				<LeadStatusBadge name={data.status.name} color={data.status.color} />
			{/if}
		</div>
		<div>
			<span class="text-xs text-surface-500">Created</span>
			<p class="text-surface-900 dark:text-surface-100">{new Date(data.lead.createdAt).toLocaleDateString()}</p>
		</div>
	</div>

	{#if data.lead.notes}
		<div class="mb-6 rounded-lg border border-surface-200 p-4 dark:border-surface-800">
			<h3 class="mb-1 text-xs font-medium text-surface-500">Notes</h3>
			<p class="whitespace-pre-wrap text-sm text-surface-900 dark:text-surface-100">{data.lead.notes}</p>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mb-4 flex gap-4 border-b border-surface-200 dark:border-surface-800">
		<button class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === 'details' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'}" onclick={() => (tab = 'details')}>Custom Fields</button>
		<button class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === 'activities' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'}" onclick={() => (tab = 'activities')}>
			Activities {#if data.activities.length > 0}<span class="ml-1 text-xs text-surface-400">({data.activities.length})</span>{/if}
		</button>
	</div>

	{#if tab === 'details'}
		<CustomFieldsPanel entityType="lead" entityId={data.lead.id} />
	{:else if tab === 'activities'}
		{#if data.activities.length === 0}
			<p class="py-8 text-center text-sm text-surface-500">No activities yet.</p>
		{:else}
			<div class="space-y-3">
				{#each data.activities as act}
					<div class="flex gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
						<span class="text-lg">{activityTypeIcon(act.type)}</span>
						<div class="flex-1">
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{act.subject}</p>
							{#if act.description}
								<p class="mt-0.5 text-xs text-surface-500">{act.description}</p>
							{/if}
							<p class="mt-1 text-xs text-surface-400">{act.userName} &middot; {relativeTime(act.createdAt)}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<LeadForm
	open={showEdit}
	onclose={() => (showEdit = false)}
	lead={data.lead}
	statuses={data.leadStatuses}
	members={data.members}
/>

{#if !isConverted}
	<LeadConvertModal
		open={showConvert}
		onclose={() => (showConvert = false)}
		lead={data.lead}
		stages={data.stages}
		members={data.members}
	/>
{/if}
