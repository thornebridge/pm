<script lang="ts">
	import EventTypeForm from '$lib/components/bookings/EventTypeForm.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { page } from '$app/state';
	import { fly, fade } from 'svelte/transition';

	let { data } = $props();

	let showForm = $state(false);
	let editingEventType = $state<typeof data.eventTypes[0] | undefined>(undefined);
	let cancelling = $state<string | null>(null);
	let selectedBooking = $state<typeof data.upcomingBookings[0] | null>(null);

	// Handle OAuth callback messages
	$effect(() => {
		const success = page.url.searchParams.get('success');
		const error = page.url.searchParams.get('error');
		if (success === 'calendar_connected') showToast('Google Calendar connected');
		if (error === 'oauth_denied') showToast('Calendar connection cancelled', 'error');
		if (error === 'oauth_invalid') showToast('Invalid OAuth state', 'error');
		if (error === 'not_configured') showToast('Google Calendar not configured', 'error');
		if (error === 'token_exchange') showToast('Failed to connect calendar', 'error');
	});

	function openCreate() {
		editingEventType = undefined;
		showForm = true;
	}

	function openEdit(et: typeof data.eventTypes[0]) {
		editingEventType = et;
		showForm = true;
	}

	async function toggleActive(et: typeof data.eventTypes[0]) {
		try {
			await api(`/api/bookings/event-types/${et.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isActive: !et.isActive })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update', 'error');
		}
	}

	async function deleteEventType(et: typeof data.eventTypes[0]) {
		if (!confirm(`Delete "${et.title}"? This will also delete all its bookings.`)) return;
		try {
			await api(`/api/bookings/event-types/${et.id}`, { method: 'DELETE' });
			showToast('Event type deleted');
			await invalidateAll();
		} catch {
			showToast('Failed to delete', 'error');
		}
	}

	async function cancelBooking(id: string) {
		cancelling = id;
		try {
			await api(`/api/bookings/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status: 'cancelled' })
			});
			showToast('Booking cancelled');
			selectedBooking = null;
			await invalidateAll();
		} catch {
			showToast('Failed to cancel', 'error');
		} finally {
			cancelling = null;
		}
	}

	function copyLink(slug: string) {
		const url = `${window.location.origin}/bookings/${slug}`;
		navigator.clipboard.writeText(url);
		showToast('Link copied');
	}

	async function disconnectCalendar() {
		try {
			await api('/api/bookings/calendar/disconnect', { method: 'POST' });
			showToast('Calendar disconnected');
			await invalidateAll();
		} catch {
			showToast('Failed to disconnect', 'error');
		}
	}

	function formatTime(ms: number, tz: string): string {
		return new Date(ms).toLocaleString('en-US', {
			timeZone: tz,
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Bookings</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Bookings</h1>
			<p class="mt-1 text-sm text-surface-500">Create booking links for clients to schedule meetings.</p>
		</div>
		<button onclick={openCreate} class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500">
			New Event Type
		</button>
	</div>

	<!-- Stats -->
	<div class="mb-6 grid grid-cols-3 gap-4">
		<div class="rounded-lg border border-surface-300 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
			<p class="text-xs text-surface-500">Active Events</p>
			<p class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">{data.stats.activeCount}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
			<p class="text-xs text-surface-500">This Week</p>
			<p class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">{data.stats.bookingsThisWeek}</p>
		</div>
		<div class="rounded-lg border border-surface-300 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
			<p class="text-xs text-surface-500">Total Bookings</p>
			<p class="mt-1 text-xl font-semibold text-surface-900 dark:text-surface-100">{data.stats.totalBookings}</p>
		</div>
	</div>

	<div class="space-y-6">
		<!-- Event Types as Cards -->
		{#if data.eventTypes.length === 0}
			<div class="rounded-lg border border-dashed border-surface-300 px-4 py-12 text-center dark:border-surface-700">
				<p class="text-sm text-surface-500">No event types yet.</p>
				<button onclick={openCreate} class="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500">
					Create your first event type
				</button>
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				{#each data.eventTypes as et (et.id)}
					<div class="rounded-lg border border-surface-300 transition dark:border-surface-700 {et.isActive ? '' : 'opacity-60'}">
						<div class="p-4">
							<div class="flex items-start gap-3">
								<div class="mt-0.5 h-3 w-3 shrink-0 rounded-full" style="background-color: {et.color}"></div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{et.title}</h3>
										{#if !et.isActive}
											<span class="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-400">Inactive</span>
										{/if}
										{#if et.schedulingType === 'round_robin'}
											<span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Round Robin</span>
										{/if}
									</div>
									<div class="mt-1 flex items-center gap-2 text-xs text-surface-500">
										<span>{et.durationMinutes} min</span>
										{#if et.location}
											<span>&middot; {et.location}</span>
										{/if}
									</div>
									{#if et.description}
										<p class="mt-1.5 text-xs text-surface-400 line-clamp-2">{et.description}</p>
									{/if}
								</div>
							</div>

							<!-- Booking Link -->
							<div class="mt-3 flex items-center gap-2 rounded-md bg-surface-100 px-3 py-1.5 dark:bg-surface-800">
								<span class="flex-1 truncate text-xs text-surface-500">/bookings/{et.slug}</span>
								<button onclick={() => copyLink(et.slug)} class="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-500">Copy</button>
							</div>

							<!-- Footer: stats + actions -->
							<div class="mt-3 flex items-center justify-between">
								<span class="text-xs text-surface-400">{et.bookingCount} booking{Number(et.bookingCount) === 1 ? '' : 's'}</span>
								<div class="flex items-center gap-1">
									<button onclick={() => toggleActive(et)} title={et.isActive ? 'Deactivate' : 'Activate'} class="rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200">
										{#if et.isActive}
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
										{:else}
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
										{/if}
									</button>
									<button onclick={() => openEdit(et)} title="Edit" class="rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
									</button>
									<button onclick={() => deleteEventType(et)} title="Delete" class="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Upcoming Bookings -->
		<div class="rounded-lg border border-surface-300 dark:border-surface-700">
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-700">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Upcoming Bookings</h2>
			</div>
			{#if data.upcomingBookings.length === 0}
				<div class="px-4 py-8 text-center text-sm text-surface-500">
					No upcoming bookings.
				</div>
			{:else}
				<div class="divide-y divide-surface-200 dark:divide-surface-800">
					{#each data.upcomingBookings as b (b.id)}
						<button
							onclick={() => { selectedBooking = b; }}
							class="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-surface-50 dark:hover:bg-surface-800/50"
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{b.inviteeName}</span>
									<span class="text-xs text-surface-500">{b.eventTypeTitle}</span>
								</div>
								<div class="mt-0.5 flex items-center gap-2 text-xs text-surface-500">
									<span>{formatTime(b.startTime, b.timezone)}</span>
									{#if b.meetLink}
										<span class="text-brand-600">&middot; Google Meet</span>
									{/if}
								</div>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-surface-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Google Calendar Integration -->
		<div class="rounded-lg border border-surface-300 dark:border-surface-700">
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-700">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Google Calendar</h2>
			</div>
			<div class="px-4 py-4">
				{#if data.calendarConnected}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-green-500"></div>
							<span class="text-sm text-surface-700 dark:text-surface-300">Connected</span>
							<span class="text-xs text-surface-500">Availability is synced from your calendar</span>
						</div>
						<button onclick={disconnectCalendar} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800">
							Disconnect
						</button>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-surface-700 dark:text-surface-300">Connect Google Calendar to sync availability and create events.</p>
							<p class="mt-1 text-xs text-surface-500">Without it, availability is based on your schedule and existing bookings.</p>
						</div>
						<a href="/api/bookings/calendar/connect" class="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500">
							Connect
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Booking Detail Slide-over -->
{#if selectedBooking}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex justify-end"
		onclick={(e) => { if (e.target === e.currentTarget) selectedBooking = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') selectedBooking = null; }}
	>
		<div class="absolute inset-0 bg-black/30 dark:bg-black/50" transition:fade={{ duration: 150 }}></div>
		<div
			class="relative w-full max-w-sm border-l border-surface-300 bg-surface-50 shadow-xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ x: 300, duration: 200 }}
		>
			<div class="flex h-full flex-col">
				<div class="flex items-center justify-between border-b border-surface-300 px-4 py-3 dark:border-surface-800">
					<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Booking Details</h3>
					<button aria-label="Close details" onclick={() => { selectedBooking = null; }} class="rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
					</button>
				</div>
				<div class="flex-1 overflow-y-auto p-4">
					<div class="space-y-4">
						<div>
							<p class="text-xs text-surface-500">Event</p>
							<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{selectedBooking.eventTypeTitle}</p>
						</div>
						<div>
							<p class="text-xs text-surface-500">When</p>
							<p class="text-sm text-surface-900 dark:text-surface-100">{formatTime(selectedBooking.startTime, selectedBooking.timezone)}</p>
							<p class="text-xs text-surface-400">{selectedBooking.timezone}</p>
						</div>
						<div>
							<p class="text-xs text-surface-500">Invitee</p>
							<p class="text-sm text-surface-900 dark:text-surface-100">{selectedBooking.inviteeName}</p>
							<p class="text-xs text-surface-400">{selectedBooking.inviteeEmail}</p>
						</div>
						{#if selectedBooking.notes}
							<div>
								<p class="text-xs text-surface-500">Notes</p>
								<p class="text-sm text-surface-700 dark:text-surface-300">{selectedBooking.notes}</p>
							</div>
						{/if}
						{#if selectedBooking.meetLink}
							<div>
								<p class="text-xs text-surface-500">Google Meet</p>
								<a href={selectedBooking.meetLink} target="_blank" rel="noopener" class="text-sm text-brand-600 underline hover:text-brand-500">
									Join Meeting
								</a>
							</div>
						{/if}
					</div>
				</div>
				<div class="border-t border-surface-300 px-4 py-3 dark:border-surface-800">
					<button
						onclick={() => { if (selectedBooking) cancelBooking(selectedBooking.id); }}
						disabled={cancelling === selectedBooking?.id}
						class="w-full rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
					>
						{cancelling === selectedBooking?.id ? 'Cancelling...' : 'Cancel Booking'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<EventTypeForm open={showForm} onclose={() => { showForm = false; }} eventType={editingEventType} />
