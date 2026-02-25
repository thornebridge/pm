<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import LeadForm from '$lib/components/crm/LeadForm.svelte';
	import LeadStatusBadge from '$lib/components/crm/LeadStatusBadge.svelte';
	import LeadConvertModal from '$lib/components/crm/LeadConvertModal.svelte';
	import CustomFieldsPanel from '$lib/components/crm/CustomFieldsPanel.svelte';
	import StageBar from '$lib/components/crm/StageBar.svelte';
	import ClickToCall from '$lib/components/crm/ClickToCall.svelte';
	import ActivityForm from '$lib/components/crm/ActivityForm.svelte';
	import CrmTaskForm from '$lib/components/crm/CrmTaskForm.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let showConvert = $state(false);
	let showActivityForm = $state(false);
	let showTaskForm = $state(false);
	let tab = $state<'overview' | 'activities' | 'tasks' | 'fields'>('overview');

	const isConverted = $derived(!!data.lead.convertedAt);

	// Map lead statuses to StageBar's Stage interface
	const stageBarStatuses = $derived(
		data.leadStatuses.map((s) => ({
			id: s.id,
			name: s.name,
			color: s.color,
			position: s.position,
			isClosed: s.isConverted || s.isDisqualified,
			isWon: s.isConverted
		}))
	);

	async function deleteLead() {
		if (!confirm('Delete this lead? This action cannot be undone.')) return;
		try {
			await api(`/api/crm/leads/${data.lead.id}`, { method: 'DELETE' });
			showToast('Lead deleted');
			goto('/crm/leads');
		} catch {
			showToast('Failed to delete lead', 'error');
		}
	}

	async function updateStatus(newStatusId: string) {
		if (isConverted) return;
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

	async function toggleTaskComplete(taskId: string, isComplete: boolean) {
		try {
			await api(`/api/crm/tasks/${taskId}`, {
				method: 'PATCH',
				body: JSON.stringify({ completed: !isComplete })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update task', 'error');
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

	function priorityColor(priority: string) {
		switch (priority) {
			case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
			case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
			case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
			case 'low': return 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400';
			default: return '';
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

	const openTasks = $derived(data.tasks.filter((t) => !t.completedAt));
	const completedTasks = $derived(data.tasks.filter((t) => !!t.completedAt));
</script>

<svelte:head>
	<title>{data.lead.firstName} {data.lead.lastName} | Leads</title>
</svelte:head>

<div class="p-6">
	<!-- Stage Bar — Salesforce-style pipeline at top -->
	{#if !isConverted}
		<StageBar
			stages={stageBarStatuses}
			currentStageId={data.lead.statusId}
			onStageChange={updateStatus}
		/>
	{:else}
		<div class="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
			<svg class="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
			</svg>
			<div>
				<p class="text-sm font-medium text-green-800 dark:text-green-300">
					Converted on {new Date(data.lead.convertedAt!).toLocaleDateString()}
				</p>
				<div class="mt-0.5 flex flex-wrap gap-3 text-sm">
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
		</div>
	{/if}

	<!-- Header -->
	<div class="mt-4 mb-6 flex items-start justify-between">
		<div>
			<a href="/crm/leads" class="text-sm text-surface-500 hover:text-surface-300">&larr; Leads</a>
			<h1 class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">
				{data.lead.firstName} {data.lead.lastName}
			</h1>
			<div class="mt-1 flex flex-wrap items-center gap-3 text-sm">
				{#if data.lead.title}
					<span class="text-surface-500">{data.lead.title}</span>
				{/if}
				{#if data.lead.title && data.lead.companyName}
					<span class="text-surface-400">at</span>
				{/if}
				{#if data.lead.companyName}
					<span class="font-medium text-surface-700 dark:text-surface-300">{data.lead.companyName}</span>
				{/if}
			</div>
			{#if data.lead.phone}
				<div class="mt-1.5">
					<ClickToCall
						phone={data.lead.phone}
						contactName="{data.lead.firstName} {data.lead.lastName}"
						telnyxEnabled={data.telnyxEnabled}
					/>
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if !isConverted}
				<button
					onclick={() => (showActivityForm = true)}
					class="rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
				>
					Log Activity
				</button>
				<button
					onclick={() => (showTaskForm = true)}
					class="rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
				>
					Add Task
				</button>
				<button
					onclick={() => (showConvert = true)}
					class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
				>
					Convert
				</button>
			{/if}
			<button
				onclick={() => (showEdit = true)}
				class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
			>
				Edit
			</button>
			<button
				onclick={deleteLead}
				class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				Delete
			</button>
		</div>
	</div>

	<!-- Info Grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 text-sm dark:border-surface-800 dark:bg-surface-900 md:grid-cols-4 lg:grid-cols-5">
		<div>
			<p class="text-xs text-surface-500">Email</p>
			{#if data.lead.email}
				<a href="mailto:{data.lead.email}" class="text-brand-500 hover:underline">{data.lead.email}</a>
			{:else}
				<p class="text-surface-400">&mdash;</p>
			{/if}
		</div>
		<div>
			<p class="text-xs text-surface-500">Phone</p>
			{#if data.lead.phone}
				<ClickToCall
					phone={data.lead.phone}
					contactName="{data.lead.firstName} {data.lead.lastName}"
					telnyxEnabled={data.telnyxEnabled}
				/>
			{:else}
				<p class="text-surface-400">&mdash;</p>
			{/if}
		</div>
		<div>
			<p class="text-xs text-surface-500">Source</p>
			<p class="capitalize text-surface-900 dark:text-surface-100">{data.lead.source?.replace('_', ' ') || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Industry</p>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.industry || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Company Size</p>
			<p class="text-surface-900 dark:text-surface-100">{data.lead.companySize || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Website</p>
			{#if data.lead.website}
				<a href={data.lead.website} target="_blank" class="text-brand-500 hover:underline">{data.lead.website}</a>
			{:else}
				<p class="text-surface-400">&mdash;</p>
			{/if}
		</div>
		<div>
			<p class="text-xs text-surface-500">Owner</p>
			<p class="text-surface-900 dark:text-surface-100">{data.owner?.name || 'Unassigned'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Status</p>
			{#if data.status}
				<LeadStatusBadge name={data.status.name} color={data.status.color} />
			{/if}
		</div>
		<div>
			<p class="text-xs text-surface-500">Created</p>
			<p class="text-surface-900 dark:text-surface-100">{new Date(data.lead.createdAt).toLocaleDateString()}</p>
		</div>
		{#if data.lead.address}
			<div>
				<p class="text-xs text-surface-500">Address</p>
				<p class="text-surface-900 dark:text-surface-100">{data.lead.address}</p>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="mb-4 flex gap-4 border-b border-surface-300 dark:border-surface-800">
		{#each [
			{ key: 'overview', label: 'Overview' },
			{ key: 'activities', label: `Activities (${data.activities.length})` },
			{ key: 'tasks', label: `Tasks (${data.tasks.length})` },
			{ key: 'fields', label: 'Custom Fields' }
		] as t}
			<button
				onclick={() => (tab = t.key as typeof tab)}
				class="border-b-2 px-1 pb-2 text-sm font-medium transition {tab === t.key ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	<!-- Tab Content -->
	{#if tab === 'overview'}
		<!-- Notes section -->
		{#if data.lead.notes}
			<div class="mb-6 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
				<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Notes</h3>
				<p class="whitespace-pre-wrap text-sm text-surface-900 dark:text-surface-100">{data.lead.notes}</p>
			</div>
		{/if}

		<!-- Quick summary cards -->
		<div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
				<p class="text-xs text-surface-500">Activities</p>
				<p class="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{data.activities.length}</p>
			</div>
			<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
				<p class="text-xs text-surface-500">Open Tasks</p>
				<p class="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">{openTasks.length}</p>
			</div>
			<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
				<p class="text-xs text-surface-500">Last Activity</p>
				<p class="mt-1 text-sm font-medium {data.activities.length > 0 ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400'}">
					{data.activities.length > 0 ? relativeTime(data.activities[0].createdAt) : 'None'}
				</p>
			</div>
			<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
				<p class="text-xs text-surface-500">Age</p>
				<p class="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
					{Math.floor((Date.now() - data.lead.createdAt) / 86400000)}d
				</p>
			</div>
		</div>

		<!-- Recent activity preview -->
		{#if data.activities.length > 0}
			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Recent Activity</h3>
					<button onclick={() => (tab = 'activities')} class="text-xs text-brand-500 hover:underline">View all</button>
				</div>
				<div class="space-y-2">
					{#each data.activities.slice(0, 3) as act}
						<div class="flex gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
							<span class="text-lg">{activityTypeIcon(act.type)}</span>
							<div class="flex-1">
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{act.subject}</p>
								{#if act.description}
									<p class="mt-0.5 text-xs text-surface-500 line-clamp-1">{act.description}</p>
								{/if}
								<p class="mt-1 text-[10px] text-surface-400">{act.userName} &middot; {relativeTime(act.createdAt)}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Open tasks preview -->
		{#if openTasks.length > 0}
			<div>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Open Tasks</h3>
					<button onclick={() => (tab = 'tasks')} class="text-xs text-brand-500 hover:underline">View all</button>
				</div>
				<div class="space-y-2">
					{#each openTasks.slice(0, 3) as task}
						<div class="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
							<button
								onclick={() => toggleTaskComplete(task.id, false)}
								aria-label="Mark task complete"
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-surface-300 transition hover:border-brand-500 dark:border-surface-600"
							>
							</button>
							<div class="flex-1">
								<p class="text-sm text-surface-900 dark:text-surface-100">{task.title}</p>
								<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-500">
									<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize {priorityColor(task.priority)}">{task.priority}</span>
									{#if task.assigneeName}<span>{task.assigneeName}</span>{/if}
									{#if task.dueDate}<span>Due {new Date(task.dueDate).toLocaleDateString()}</span>{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Custom fields inline -->
		<div class="mt-6 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
			<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">Custom Fields</h3>
			<CustomFieldsPanel entityType="lead" entityId={data.lead.id} />
		</div>
	{/if}

	{#if tab === 'activities'}
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
				{data.activities.length} {data.activities.length === 1 ? 'Activity' : 'Activities'}
			</h3>
			{#if !isConverted}
				<button
					onclick={() => (showActivityForm = true)}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
				>
					Log Activity
				</button>
			{/if}
		</div>

		{#if data.activities.length === 0}
			<div class="py-12 text-center">
				<p class="text-sm text-surface-500">No activities recorded yet.</p>
				{#if !isConverted}
					<button
						onclick={() => (showActivityForm = true)}
						class="mt-2 text-sm text-brand-500 hover:underline"
					>
						Log your first activity
					</button>
				{/if}
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.activities as act (act.id)}
					<div class="flex gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
						<span class="text-lg">{activityTypeIcon(act.type)}</span>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{act.subject}</p>
								<span class="rounded-full bg-surface-200 px-1.5 py-0.5 text-[10px] font-medium capitalize text-surface-600 dark:bg-surface-800 dark:text-surface-400">{act.type}</span>
							</div>
							{#if act.description}
								<p class="mt-0.5 text-xs text-surface-600 dark:text-surface-400">{act.description}</p>
							{/if}
							<p class="mt-1 text-[10px] text-surface-400">{act.userName} &middot; {relativeTime(act.createdAt)}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'tasks'}
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
				{data.tasks.length} {data.tasks.length === 1 ? 'Task' : 'Tasks'}
				{#if openTasks.length > 0 && completedTasks.length > 0}
					<span class="ml-1 text-xs font-normal text-surface-500">({openTasks.length} open)</span>
				{/if}
			</h3>
			{#if !isConverted}
				<button
					onclick={() => (showTaskForm = true)}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
				>
					Add Task
				</button>
			{/if}
		</div>

		{#if data.tasks.length === 0}
			<div class="py-12 text-center">
				<p class="text-sm text-surface-500">No tasks yet.</p>
				{#if !isConverted}
					<button
						onclick={() => (showTaskForm = true)}
						class="mt-2 text-sm text-brand-500 hover:underline"
					>
						Create your first task
					</button>
				{/if}
			</div>
		{:else}
			<!-- Open tasks -->
			{#if openTasks.length > 0}
				<div class="space-y-2">
					{#each openTasks as task (task.id)}
						<div class="flex items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
							<button
								onclick={() => toggleTaskComplete(task.id, false)}
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-surface-300 transition hover:border-green-500 hover:bg-green-50 dark:border-surface-600 dark:hover:border-green-400 dark:hover:bg-green-900/20"
								title="Mark complete"
							>
							</button>
							<div class="flex-1">
								<p class="text-sm text-surface-900 dark:text-surface-100">{task.title}</p>
								{#if task.description}
									<p class="mt-0.5 text-xs text-surface-500 line-clamp-1">{task.description}</p>
								{/if}
								<div class="mt-1 flex items-center gap-2 text-[10px] text-surface-500">
									<span class="rounded-full px-1.5 py-0.5 font-medium capitalize {priorityColor(task.priority)}">{task.priority}</span>
									{#if task.assigneeName}<span>{task.assigneeName}</span>{/if}
									{#if task.dueDate}
										<span class={Date.now() > task.dueDate ? 'font-medium text-red-500' : ''}>
											Due {new Date(task.dueDate).toLocaleDateString()}
										</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Completed tasks -->
			{#if completedTasks.length > 0}
				{#if openTasks.length > 0}
					<div class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-surface-500">
						Completed ({completedTasks.length})
					</div>
				{/if}
				<div class="space-y-2">
					{#each completedTasks as task (task.id)}
						<div class="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3 opacity-60 dark:border-surface-800 dark:bg-surface-900">
							<button
								onclick={() => toggleTaskComplete(task.id, true)}
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-green-500 bg-green-500 text-white transition hover:bg-green-600"
								title="Mark incomplete"
							>
								<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
							</button>
							<div class="flex-1">
								<p class="text-sm text-surface-900 line-through dark:text-surface-100">{task.title}</p>
								<div class="mt-0.5 flex items-center gap-2 text-[10px] text-surface-500">
									{#if task.assigneeName}<span>{task.assigneeName}</span>{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}

	{#if tab === 'fields'}
		<CustomFieldsPanel entityType="lead" entityId={data.lead.id} />
	{/if}
</div>

<!-- Modals -->
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

<ActivityForm
	open={showActivityForm}
	onclose={() => (showActivityForm = false)}
	companies={data.crmCompanies}
	members={data.members}
	prefilledLeadId={data.lead.id}
/>

<CrmTaskForm
	open={showTaskForm}
	onclose={() => (showTaskForm = false)}
	companies={data.crmCompanies}
	members={data.members}
	prefilledLeadId={data.lead.id}
/>
