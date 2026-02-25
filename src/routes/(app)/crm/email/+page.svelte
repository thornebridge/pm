<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import GmailConnectCard from '$lib/components/crm/gmail/GmailConnectCard.svelte';
	import ThreadList from '$lib/components/crm/gmail/ThreadList.svelte';
	import ThreadView from '$lib/components/crm/gmail/ThreadView.svelte';
	import ComposeEmail from '$lib/components/crm/gmail/ComposeEmail.svelte';

	let { data } = $props();

	let category = $state<'inbox' | 'sent' | 'archived' | 'all'>('inbox');
	let search = $state('');
	let threads = $state<any[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let selectedThreadId = $state<string | null>(null);
	let selectedThread = $state<any>(null);
	let showCompose = $state(false);
	let syncing = $state(false);
	let syncError = $state<string | null>(data.syncError);

	// Handle OAuth callback messages
	$effect(() => {
		const success = page.url.searchParams.get('success');
		const error = page.url.searchParams.get('error');
		if (success === 'gmail_connected') {
			showToast('Gmail connected successfully');
			triggerSync();
		}
		if (error === 'oauth_denied') showToast('Gmail connection cancelled', 'error');
		if (error === 'oauth_invalid') showToast('Invalid OAuth state', 'error');
		if (error === 'not_configured') showToast('Google OAuth not configured', 'error');
		if (error === 'token_exchange') showToast('Failed to connect Gmail', 'error');
	});

	$effect(() => {
		if (data.gmailConnected) {
			loadThreads();
		}
	});

	// Reload when category or search changes
	$effect(() => {
		// Access reactive dependencies
		category;
		search;
		if (data.gmailConnected) {
			loadThreads();
		}
	});

	async function loadThreads() {
		loading = true;
		try {
			const params = new URLSearchParams({ category, limit: '50', offset: '0' });
			if (search) params.set('search', search);
			const res = await api<{ threads: any[]; total: number }>(`/api/crm/gmail/threads?${params}`);
			threads = res.threads;
			total = res.total;
		} catch {
			showToast('Failed to load emails', 'error');
		} finally {
			loading = false;
		}
	}

	async function selectThread(threadId: string) {
		selectedThreadId = threadId;
		try {
			const res = await api<any>(`/api/crm/gmail/threads/${threadId}`);
			selectedThread = res;

			// Mark as read if unread
			const thread = threads.find((t) => t.id === threadId);
			if (thread && !thread.isRead) {
				await api(`/api/crm/gmail/threads/${threadId}`, {
					method: 'PATCH',
					body: JSON.stringify({ isRead: true })
				});
				thread.isRead = true;
			}
		} catch {
			showToast('Failed to load thread', 'error');
		}
	}

	async function triggerSync(full = false) {
		syncing = true;
		syncError = null;
		try {
			const url = full ? '/api/crm/gmail/sync?full=true' : '/api/crm/gmail/sync';
			await api(url, { method: 'POST' });
			await loadThreads();
			syncError = null;
			showToast(full ? 'Full sync complete' : 'Email synced');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Sync failed';
			syncError = msg;
			showToast(msg, 'error');
		} finally {
			syncing = false;
		}
	}

	async function disconnectGmail() {
		if (!confirm('Disconnect Gmail? All synced emails will be removed.')) return;
		try {
			await api('/api/crm/gmail/disconnect', { method: 'POST' });
			showToast('Gmail disconnected');
			await invalidateAll();
		} catch {
			showToast('Failed to disconnect', 'error');
		}
	}

	function handleBack() {
		selectedThreadId = null;
		selectedThread = null;
	}

	let searchTimeout: ReturnType<typeof setTimeout>;
	function onSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			search = value;
		}, 300);
	}
</script>

<svelte:head>
	<title>Email | CRM</title>
</svelte:head>

{#if !data.gmailConnected}
	<div class="flex items-center justify-center p-6">
		<GmailConnectCard />
	</div>
{:else}
	<div class="flex h-full flex-col">
	{#if syncError}
		<div class="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
			<div class="flex items-start gap-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
				</svg>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-red-800 dark:text-red-300">Gmail sync error</p>
					<p class="mt-0.5 text-xs text-red-700 dark:text-red-400">{syncError}</p>
				</div>
				<div class="flex shrink-0 gap-2">
					<button
						onclick={() => triggerSync(true)}
						disabled={syncing}
						class="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 disabled:opacity-50"
					>
						{syncing ? 'Retrying...' : 'Retry full sync'}
					</button>
					<button
						onclick={() => (syncError = null)}
						class="text-red-400 hover:text-red-600 dark:hover:text-red-300"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/if}
	<div class="flex flex-1 min-h-0">
		<!-- Left sidebar: categories + search -->
		<div class="flex w-56 shrink-0 flex-col border-r border-surface-300 dark:border-surface-800 {selectedThreadId ? 'hidden md:flex' : ''}">
			<div class="border-b border-surface-300 p-3 dark:border-surface-800">
				<div class="flex items-center justify-between">
					<h1 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Email</h1>
					<div class="flex gap-1">
						<button
							onclick={() => triggerSync()}
							disabled={syncing}
							title="Sync"
							class="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200 disabled:opacity-50"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {syncing ? 'animate-spin' : ''}" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
							</svg>
						</button>
						<button
							onclick={() => (showCompose = true)}
							title="Compose"
							class="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
							</svg>
						</button>
					</div>
				</div>
				<input
					type="text"
					placeholder="Search emails..."
					oninput={onSearchInput}
					class="mt-2 w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-xs text-surface-900 placeholder-surface-400 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>

			<nav class="flex-1 space-y-0.5 p-2">
				{#each [
					{ key: 'inbox', label: 'Inbox', icon: 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z' },
					{ key: 'sent', label: 'Sent', icon: 'M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z' },
					{ key: 'archived', label: 'Archived', icon: 'M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6h12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9zm5 2a1 1 0 000 2h2a1 1 0 100-2H9z' },
					{ key: 'all', label: 'All Mail', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
				] as cat}
					<button
						onclick={() => (category = cat.key as typeof category)}
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm {category === cat.key ? 'bg-brand-600/10 text-brand-600 dark:text-brand-400' : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'}"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d={cat.icon} clip-rule="evenodd" />
						</svg>
						{cat.label}
					</button>
				{/each}
			</nav>

			<div class="border-t border-surface-300 p-3 dark:border-surface-800">
				<div class="flex items-center justify-between">
					<div class="text-[10px] text-surface-500">
						{data.gmailEmail}
					</div>
					<div class="flex gap-2">
						<button onclick={() => triggerSync(true)} disabled={syncing} class="text-[10px] text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 disabled:opacity-50">
							Re-sync
						</button>
						<button onclick={disconnectGmail} class="text-[10px] text-red-500 hover:text-red-400">
							Disconnect
						</button>
					</div>
				</div>
				{#if data.lastSyncAt}
					<div class="mt-0.5 text-[10px] text-surface-500">
						Last sync: {new Date(data.lastSyncAt).toLocaleTimeString()}
					</div>
				{/if}
			</div>
		</div>

		<!-- Center: thread list -->
		<div class="flex-1 {selectedThreadId ? 'hidden md:block md:max-w-md md:border-r md:border-surface-300 md:dark:border-surface-800' : ''}">
			<ThreadList
				{threads}
				{total}
				{loading}
				{selectedThreadId}
				onselect={selectThread}
			/>
		</div>

		<!-- Right: thread detail -->
		{#if selectedThread}
			<div class="flex-1 overflow-hidden {selectedThreadId ? '' : 'hidden md:block'}">
				<ThreadView
					thread={selectedThread.thread}
					messages={selectedThread.messages}
					linkedEntities={selectedThread.linkedEntities}
					contacts={data.contacts}
					onback={handleBack}
					onrefresh={loadThreads}
				/>
			</div>
		{:else}
			<div class="hidden flex-1 items-center justify-center md:flex">
				<p class="text-sm text-surface-500">Select a conversation to read</p>
			</div>
		{/if}
	</div>
	</div>
{/if}

<ComposeEmail
	open={showCompose}
	onclose={() => { showCompose = false; }}
	contacts={data.contacts}
	onsent={() => { showCompose = false; loadThreads(); }}
/>
