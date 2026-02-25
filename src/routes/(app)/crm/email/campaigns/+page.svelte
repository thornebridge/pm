<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let campaigns = $state<any[]>(data.campaigns);
	let acting = $state<string | null>(null);

	const statusColors: Record<string, string> = {
		draft: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
		queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
		sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
	};

	async function updateStatus(id: string, status: string) {
		acting = id;
		try {
			await api(`/api/crm/gmail/campaigns/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status })
			});
			campaigns = campaigns.map((c) =>
				c.id === id ? { ...c, status } : c
			);
			showToast(`Campaign ${status === 'queued' ? 'started' : status}`);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Action failed', 'error');
		} finally {
			acting = null;
		}
	}

	async function deleteCampaign(id: string) {
		if (!confirm('Delete this draft campaign?')) return;
		acting = id;
		try {
			await api(`/api/crm/gmail/campaigns/${id}`, { method: 'DELETE' });
			campaigns = campaigns.filter((c) => c.id !== id);
			showToast('Campaign deleted');
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
		} finally {
			acting = null;
		}
	}

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Campaigns | CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Email Campaigns</h1>
			<p class="text-xs text-surface-500">Send personalized bulk emails using templates</p>
		</div>
		<div class="flex gap-2">
			<a href="/crm/email" class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">
				Back to Email
			</a>
			<a href="/crm/email/campaigns/new" class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">
				New Campaign
			</a>
		</div>
	</div>

	{#if campaigns.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-300 py-12 dark:border-surface-700">
			<svg xmlns="http://www.w3.org/2000/svg" class="mb-3 h-10 w-10 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
			</svg>
			<p class="text-sm text-surface-600 dark:text-surface-400">No campaigns yet</p>
			<a href="/crm/email/campaigns/new" class="mt-3 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">
				Create your first campaign
			</a>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800">
					<tr>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Template</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Status</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Progress</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Created</th>
						<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-200 dark:divide-surface-700">
					{#each campaigns as campaign (campaign.id)}
						<tr class="bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/50">
							<td class="px-4 py-3">
								<a href="/crm/email/campaigns/{campaign.id}" class="font-medium text-surface-900 hover:text-brand-600 dark:text-surface-100 dark:hover:text-brand-400">
									{campaign.name}
								</a>
							</td>
							<td class="px-4 py-3 text-surface-600 dark:text-surface-400">{campaign.templateName || '—'}</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium {statusColors[campaign.status] || ''}">
									{campaign.status}
								</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<div class="h-1.5 flex-1 rounded-full bg-surface-200 dark:bg-surface-700">
										<div
											class="h-full rounded-full bg-brand-500 transition-all"
											style="width: {campaign.totalRecipients > 0 ? (campaign.sentCount / campaign.totalRecipients) * 100 : 0}%"
										></div>
									</div>
									<span class="text-xs text-surface-500">{campaign.sentCount}/{campaign.totalRecipients}</span>
								</div>
							</td>
							<td class="px-4 py-3 text-xs text-surface-500">{formatDate(campaign.createdAt)}</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									<a href="/crm/email/campaigns/{campaign.id}" class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400">View</a>
									{#if campaign.status === 'draft'}
										<button onclick={() => updateStatus(campaign.id, 'queued')} disabled={acting === campaign.id} class="text-xs text-green-600 hover:text-green-500 disabled:opacity-50">Start</button>
										<button onclick={() => deleteCampaign(campaign.id)} disabled={acting === campaign.id} class="text-xs text-red-600 hover:text-red-500 disabled:opacity-50">Delete</button>
									{:else if campaign.status === 'sending'}
										<button onclick={() => updateStatus(campaign.id, 'paused')} disabled={acting === campaign.id} class="text-xs text-yellow-600 hover:text-yellow-500 disabled:opacity-50">Pause</button>
									{:else if campaign.status === 'paused'}
										<button onclick={() => updateStatus(campaign.id, 'queued')} disabled={acting === campaign.id} class="text-xs text-green-600 hover:text-green-500 disabled:opacity-50">Resume</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
