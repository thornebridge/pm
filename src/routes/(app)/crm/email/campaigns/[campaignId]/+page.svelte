<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let campaign = $state<any>(data.campaign);
	let recipients = $state<any[]>(data.recipients);
	let acting = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	const statusColors: Record<string, string> = {
		pending: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
		sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		skipped: 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-500'
	};

	const campaignStatusColors: Record<string, string> = {
		draft: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
		queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
		sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
	};

	const failedRetryable = $derived(
		recipients.filter((r) => r.status === 'failed' && r.retryCount < 3).length
	);

	const progressPercent = $derived(
		campaign.totalRecipients > 0
			? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
			: 0
	);

	function formatDate(ms: number | null): string {
		if (!ms) return '—';
		return new Date(ms).toLocaleString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	async function refresh() {
		try {
			const res = await api<{ campaign: typeof campaign; recipients: typeof recipients }>(
				`/api/crm/gmail/campaigns/${campaign.id}`
			);
			campaign = { ...campaign, ...res.campaign };
			recipients = res.recipients;
		} catch {
			// Ignore refresh errors
		}
	}

	async function updateStatus(status: string) {
		acting = true;
		try {
			await api(`/api/crm/gmail/campaigns/${campaign.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status })
			});
			campaign = { ...campaign, status };
			showToast(`Campaign ${status === 'queued' ? 'resumed' : status}`);
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Action failed', 'error');
		} finally {
			acting = false;
		}
	}

	async function retryFailed() {
		acting = true;
		try {
			await api(`/api/crm/gmail/campaigns/${campaign.id}/retry`, { method: 'POST' });
			showToast('Retrying failed recipients');
			await refresh();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Retry failed', 'error');
		} finally {
			acting = false;
		}
	}

	onMount(() => {
		// Auto-poll while sending
		pollTimer = setInterval(() => {
			if (campaign.status === 'sending' || campaign.status === 'queued') {
				refresh();
			}
		}, 5000);
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});
</script>

<svelte:head>
	<title>{campaign.name} | Campaigns</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<div class="flex items-center gap-2">
				<a href="/crm/email/campaigns" class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">Campaigns</a>
				<span class="text-xs text-surface-400">/</span>
			</div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">{campaign.name}</h1>
		</div>
		<div class="flex items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {campaignStatusColors[campaign.status] || ''}">
				{campaign.status}
			</span>
			{#if campaign.status === 'sending'}
				<button onclick={() => updateStatus('paused')} disabled={acting} class="rounded-md border border-yellow-300 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 dark:border-yellow-700 dark:text-yellow-400">
					Pause
				</button>
			{:else if campaign.status === 'paused'}
				<button onclick={() => updateStatus('queued')} disabled={acting} class="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50">
					Resume
				</button>
			{/if}
			{#if failedRetryable > 0}
				<button onclick={retryFailed} disabled={acting} class="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400">
					Retry Failed ({failedRetryable})
				</button>
			{/if}
		</div>
	</div>

	<!-- Progress bar -->
	<div class="mb-6 rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
		<div class="mb-2 flex items-center justify-between">
			<span class="text-xs text-surface-500">Progress</span>
			<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{campaign.sentCount} / {campaign.totalRecipients} ({progressPercent}%)</span>
		</div>
		<div class="h-2 rounded-full bg-surface-200 dark:bg-surface-700">
			<div class="h-full rounded-full bg-brand-500 transition-all" style="width: {progressPercent}%"></div>
		</div>
		<div class="mt-2 flex gap-4 text-xs text-surface-500">
			<span>Template: {campaign.templateName}</span>
			{#if campaign.startedAt}<span>Started: {formatDate(campaign.startedAt)}</span>{/if}
			{#if campaign.completedAt}<span>Completed: {formatDate(campaign.completedAt)}</span>{/if}
			{#if campaign.failedCount > 0}<span class="text-red-500">{campaign.failedCount} failed</span>{/if}
		</div>
	</div>

	<!-- Recipients table -->
	<div class="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800">
				<tr>
					<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Name</th>
					<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Email</th>
					<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Status</th>
					<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Sent At</th>
					<th class="px-4 py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Error</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-surface-200 dark:divide-surface-700">
				{#each recipients as r (r.id)}
					<tr class="bg-white dark:bg-surface-900">
						<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{r.firstName} {r.lastName}</td>
						<td class="px-4 py-2 text-surface-600 dark:text-surface-400">{r.email || '—'}</td>
						<td class="px-4 py-2">
							<span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium {statusColors[r.status] || ''}">
								{r.status}
							</span>
						</td>
						<td class="px-4 py-2 text-xs text-surface-500">{formatDate(r.sentAt)}</td>
						<td class="max-w-xs truncate px-4 py-2 text-xs text-red-500">{r.errorMessage || ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
