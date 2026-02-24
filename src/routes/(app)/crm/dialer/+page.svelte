<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { getDialerState, makeCall, hangup } from '$lib/stores/dialer.svelte.js';

	import DialerSessionHistory from '$lib/components/crm/dialer/DialerSessionHistory.svelte';
	import DialerSessionStats from '$lib/components/crm/dialer/DialerSessionStats.svelte';
	import DialerContactSearch from '$lib/components/crm/dialer/DialerContactSearch.svelte';
	import DialerQueue from '$lib/components/crm/dialer/DialerQueue.svelte';
	import DialerActiveCall from '$lib/components/crm/dialer/DialerActiveCall.svelte';
	import DispositionForm from '$lib/components/crm/dialer/DispositionForm.svelte';

	let { data } = $props();

	// ─── Session & Queue State ──────────────────────────────────────────────────

	let activeSession = $state(data.activeSession);
	let queueItems = $state(data.queueItems as any[]);
	let sessions = $state(data.sessions as any[]);
	let showNewSessionInput = $state(false);
	let newSessionName = $state('');
	let creating = $state(false);

	// ─── Auto-Dial State Machine ────────────────────────────────────────────────

	type DialMode = 'idle' | 'dialing' | 'incall' | 'disposing' | 'paused';
	let dialMode = $state<DialMode>('idle');
	let currentQueueIndex = $state(0);
	let lastCallDuration = $state(0);

	const dialerState = getDialerState();

	const currentItem = $derived(
		dialMode !== 'idle' && currentQueueIndex < queueItems.length
			? queueItems[currentQueueIndex]
			: null
	);

	const pendingItems = $derived(queueItems.filter((i) => i.status === 'pending'));
	const skippedCount = $derived(queueItems.filter((i) => i.status === 'skipped').length);

	// Watch callState to drive the auto-dial flow
	let prevCallState = $state('idle');

	$effect(() => {
		const cs = dialerState.callState;

		// Transition: connecting/ringing → active (call connected)
		if (dialMode === 'dialing' && cs === 'active') {
			dialMode = 'incall';
		}

		// Transition: incall → idle (call ended after connecting, show disposition)
		if (dialMode === 'incall' && cs === 'idle' && prevCallState !== 'idle') {
			lastCallDuration = dialerState.callDuration || 0;
			dialMode = 'disposing';
		}

		// Transition: dialing → idle (call failed/ended without ever connecting)
		if (dialMode === 'dialing' && cs === 'idle' && prevCallState !== 'idle') {
			lastCallDuration = 0;
			dialMode = 'disposing';
		}

		prevCallState = cs;
	});

	// ─── Session Management ─────────────────────────────────────────────────────

	async function createSession() {
		if (!newSessionName.trim() || creating) return;
		creating = true;
		try {
			const session = await api<any>('/api/crm/dialer/sessions', {
				method: 'POST',
				body: JSON.stringify({ name: newSessionName.trim() })
			});
			activeSession = session;
			queueItems = [];
			sessions = [session, ...sessions];
			newSessionName = '';
			showNewSessionInput = false;
		} finally {
			creating = false;
		}
	}

	async function selectSession(session: any) {
		// Load this session's details
		const detail = await api<any>(`/api/crm/dialer/sessions/${session.id}`);
		activeSession = detail;
		queueItems = detail.items || [];
		dialMode = 'idle';
		currentQueueIndex = 0;
	}

	async function closeSession() {
		activeSession = null;
		queueItems = [];
		dialMode = 'idle';
		currentQueueIndex = 0;
		await refreshSessions();
	}

	async function completeSession() {
		if (!activeSession) return;
		await api(`/api/crm/dialer/sessions/${activeSession.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'completed', endedAt: Date.now() })
		});
		await closeSession();
	}

	async function refreshSessions() {
		sessions = await api<any[]>('/api/crm/dialer/sessions');
	}

	// ─── Queue Management ───────────────────────────────────────────────────────

	async function refreshQueue() {
		if (!activeSession) return;
		const items = await api<any[]>(`/api/crm/dialer/sessions/${activeSession.id}/queue`);
		queueItems = items;
		// Also refresh session stats
		const detail = await api<any>(`/api/crm/dialer/sessions/${activeSession.id}`);
		activeSession = detail;
	}

	async function removeQueueItem(itemId: string) {
		if (!activeSession) return;
		await api(`/api/crm/dialer/sessions/${activeSession.id}/queue/${itemId}`, {
			method: 'DELETE'
		});
		queueItems = queueItems.filter((i) => i.id !== itemId);
		if (activeSession) {
			activeSession = { ...activeSession, totalContacts: Math.max(activeSession.totalContacts - 1, 0) };
		}
	}

	async function moveQueueItem(itemId: string, direction: 'up' | 'down') {
		const idx = queueItems.findIndex((i) => i.id === itemId);
		if (idx < 0) return;
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= queueItems.length) return;

		// Swap positions
		const items = [...queueItems];
		const tempPos = items[idx].position;
		items[idx] = { ...items[idx], position: items[swapIdx].position };
		items[swapIdx] = { ...items[swapIdx], position: tempPos };

		// Swap in array
		[items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
		queueItems = items;

		// Persist
		await api(`/api/crm/dialer/sessions/${activeSession!.id}/queue/reorder`, {
			method: 'POST',
			body: JSON.stringify({
				items: [
					{ id: items[idx].id, position: items[idx].position },
					{ id: items[swapIdx].id, position: items[swapIdx].position }
				]
			})
		});
	}

	// ─── Auto-Dial Controls ─────────────────────────────────────────────────────

	function findNextPendingIndex(startFrom: number = 0): number {
		for (let i = startFrom; i < queueItems.length; i++) {
			if (queueItems[i].status === 'pending' && queueItems[i].contactPhone) {
				return i;
			}
		}
		return -1;
	}

	async function startDialing() {
		if (!activeSession || pendingItems.length === 0) return;

		// Mark session as started if not already
		if (!activeSession.startedAt) {
			await api(`/api/crm/dialer/sessions/${activeSession.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ startedAt: Date.now() })
			});
		}

		const nextIdx = findNextPendingIndex(0);
		if (nextIdx < 0) {
			dialMode = 'idle';
			return;
		}
		currentQueueIndex = nextIdx;
		dialNextContact();
	}

	function dialNextContact() {
		const item = queueItems[currentQueueIndex];
		if (!item || !item.contactPhone) {
			// Skip contacts without phone and find next
			advanceToNext();
			return;
		}

		dialMode = 'dialing';

		// Mark queue item as calling
		api(`/api/crm/dialer/sessions/${activeSession!.id}/queue/${item.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'calling', dialedAt: Date.now() })
		});
		queueItems[currentQueueIndex] = { ...item, status: 'calling', dialedAt: Date.now() };

		// Place the call
		makeCall(item.contactPhone, {
			contactId: item.contactId,
			companyId: item.companyId || undefined,
			contactName: `${item.contactFirstName} ${item.contactLastName}`
		});
	}

	function advanceToNext() {
		const nextIdx = findNextPendingIndex(currentQueueIndex + 1);
		if (nextIdx < 0) {
			// Queue exhausted
			dialMode = 'idle';
			completeSession();
			return;
		}
		currentQueueIndex = nextIdx;
		dialNextContact();
	}

	async function handleDisposition(disposition: string, notes: string, callbackAt: number | null) {
		const item = queueItems[currentQueueIndex];
		if (!item || !activeSession) return;

		// Link the call log if available
		const callLogId = dialerState.localCallLogId || null;

		await api(`/api/crm/dialer/sessions/${activeSession.id}/queue/${item.id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				status: 'completed',
				disposition,
				notes: notes || null,
				callbackAt,
				callLogId,
				callDurationSeconds: lastCallDuration,
				completedAt: Date.now()
			})
		});

		// Update local state
		queueItems[currentQueueIndex] = { ...item, status: 'completed', disposition };

		// Refresh session to get updated stats
		const detail = await api<any>(`/api/crm/dialer/sessions/${activeSession.id}`);
		activeSession = detail;

		// Move to next
		advanceToNext();
	}

	async function handleSkip() {
		const item = queueItems[currentQueueIndex];
		if (!item || !activeSession) return;

		// If currently in a call, hang up first
		if (dialerState.callState !== 'idle') {
			hangup();
		}

		await api(`/api/crm/dialer/sessions/${activeSession.id}/queue/${item.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ status: 'skipped' })
		});

		queueItems[currentQueueIndex] = { ...item, status: 'skipped' };
		advanceToNext();
	}

	function pauseDialing() {
		// If in a call, let it finish — just stop auto-advancing
		dialMode = 'paused';
		if (dialerState.callState !== 'idle') {
			hangup();
		}
	}

	function resumeDialing() {
		const nextIdx = findNextPendingIndex(currentQueueIndex);
		if (nextIdx < 0) {
			dialMode = 'idle';
			return;
		}
		currentQueueIndex = nextIdx;
		dialNextContact();
	}

	function stopSession() {
		if (dialerState.callState !== 'idle') {
			hangup();
		}
		dialMode = 'idle';
	}

	// ─── View Helpers ───────────────────────────────────────────────────────────

	const isDialingActive = $derived(
		dialMode === 'dialing' || dialMode === 'incall' || dialMode === 'disposing'
	);
</script>

<svelte:head>
	<title>Dialer</title>
</svelte:head>

{#if !data.telnyxEnabled}
<div class="p-6">
	<div class="mx-auto max-w-md rounded-lg border border-surface-200 bg-surface-50 p-8 text-center dark:border-surface-700 dark:bg-surface-800/50">
		<svg class="mx-auto mb-3 h-10 w-10 text-surface-400" viewBox="0 0 20 20" fill="currentColor">
			<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
		</svg>
		<h2 class="mb-2 text-lg font-semibold text-surface-900 dark:text-surface-100">Telephony Not Enabled</h2>
		<p class="text-sm text-surface-500 dark:text-surface-400">
			The dialer requires Telnyx telephony integration. Enable it in <a href="/admin" class="text-brand-600 hover:underline dark:text-brand-400">Admin Settings</a>.
		</p>
	</div>
</div>
{:else}
<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Dialer</h1>
			{#if activeSession}
				<p class="text-sm text-surface-500">{activeSession.name}</p>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if activeSession && !isDialingActive}
				<button
					onclick={closeSession}
					class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
				>
					Back to Sessions
				</button>
			{/if}
		</div>
	</div>

	<!-- ═══ STATE 1: No active session — show history ═══ -->
	{#if !activeSession}
		{#if showNewSessionInput}
			<div class="mb-6 flex items-center gap-2">
				<input
					bind:value={newSessionName}
					placeholder="Session name (e.g., Morning Cold Calls)"
					onkeydown={(e) => { if (e.key === 'Enter') createSession(); }}
					class="w-80 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-400 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
				<button
					onclick={createSession}
					disabled={!newSessionName.trim() || creating}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
				>
					{creating ? 'Creating...' : 'Create'}
				</button>
				<button
					onclick={() => { showNewSessionInput = false; newSessionName = ''; }}
					class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400"
				>
					Cancel
				</button>
			</div>
		{/if}

		<DialerSessionHistory
			{sessions}
			onselect={selectSession}
			oncreate={() => (showNewSessionInput = true)}
		/>

	<!-- ═══ STATE 2+3: Active session ═══ -->
	{:else}
		<!-- Stats bar (always visible when session exists) -->
		{#if activeSession.startedAt || activeSession.completedContacts > 0}
			<div class="mb-4">
				<DialerSessionStats
					totalContacts={activeSession.totalContacts}
					completedContacts={activeSession.completedContacts}
					totalConnected={activeSession.totalConnected}
					totalNoAnswer={activeSession.totalNoAnswer}
					totalDurationSeconds={activeSession.totalDurationSeconds}
					{skippedCount}
				/>
			</div>
		{/if}

		<!-- ═══ STATE 3: Active dialing ═══ -->
		{#if isDialingActive || dialMode === 'paused'}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<!-- Main area: active call or disposition -->
				<div class="lg:col-span-2 space-y-4">
					{#if dialMode === 'disposing' && currentItem}
						<DispositionForm
							contactName="{currentItem.contactFirstName} {currentItem.contactLastName}"
							onsave={handleDisposition}
							onskip={handleSkip}
						/>
					{:else if currentItem}
						<DialerActiveCall
							item={currentItem}
							onskip={handleSkip}
							onstop={stopSession}
						/>
					{/if}

					{#if dialMode === 'paused'}
						<div class="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-900/20">
							<span class="text-sm text-yellow-700 dark:text-yellow-400">Session paused.</span>
							<button
								onclick={resumeDialing}
								class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500"
							>
								Resume Dialing
							</button>
							<button
								onclick={stopSession}
								class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400"
							>
								Stop
							</button>
						</div>
					{/if}
				</div>

				<!-- Queue sidebar -->
				<div>
					<DialerQueue
						items={queueItems}
						currentItemId={currentItem?.id}
						onremove={removeQueueItem}
						onmoveup={(id) => moveQueueItem(id, 'up')}
						onmovedown={(id) => moveQueueItem(id, 'down')}
					/>
				</div>
			</div>

		<!-- ═══ STATE 2: Building queue ═══ -->
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- Contact search (left) -->
				<div>
					<DialerContactSearch
						sessionId={activeSession.id}
						companies={data.crmCompanies}
						members={data.members}
						stages={data.stages}
						oncontactsadded={refreshQueue}
					/>
				</div>

				<!-- Queue (right) -->
				<div>
					<div class="mb-3 flex items-center gap-2">
						{#if pendingItems.length > 0}
							<button
								onclick={startDialing}
								class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
							>
								<span class="mr-1.5">&#9654;</span>
								Start Dialing ({pendingItems.length} contacts)
							</button>
						{/if}
						{#if activeSession.completedContacts > 0 || queueItems.length > 0}
							<button
								onclick={completeSession}
								class="rounded-md border border-surface-300 px-3 py-2 text-sm text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400"
							>
								Complete Session
							</button>
						{/if}
					</div>
					<DialerQueue
						items={queueItems}
						onremove={removeQueueItem}
						onmoveup={(id) => moveQueueItem(id, 'up')}
						onmovedown={(id) => moveQueueItem(id, 'down')}
					/>
				</div>
			</div>
		{/if}
	{/if}
</div>
{/if}
