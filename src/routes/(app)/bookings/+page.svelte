<script lang="ts">
	import EventTypeForm from '$lib/components/bookings/EventTypeForm.svelte';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { page } from '$app/state';

	let { data } = $props();

	let showForm = $state(false);
	let editingEventType = $state<typeof data.eventTypes[0] | undefined>(undefined);
	let cancelling = $state<string | null>(null);

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
	<div class="mb-6">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Bookings</h1>
		<p class="mt-1 text-sm text-surface-500">Create booking links for clients to schedule meetings.</p>
	</div>

	<div class="space-y-6">
		<!-- Event Types -->
		<div class="rounded-lg border border-surface-300 dark:border-surface-700">
			<div class="flex items-center justify-between border-b border-surface-300 px-4 py-3 dark:border-surface-700">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Event Types</h2>
				<button onclick={openCreate} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500">
					New Event Type
				</button>
			</div>
			{#if data.eventTypes.length === 0}
				<div class="px-4 py-8 text-center text-sm text-surface-500">
					No event types yet. Create one to start accepting bookings.
				</div>
			{:else}
				<div class="divide-y divide-surface-200 dark:divide-surface-800">
					{#each data.eventTypes as et (et.id)}
						<div class="flex items-center gap-4 px-4 py-3">
							<div class="h-2 w-2 shrink-0 rounded-full" style="background-color: {et.color}"></div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-surface-900 dark:text-surface-100">{et.title}</span>
									<span class="text-xs text-surface-500">{et.durationMinutes} min</span>
									{#if !et.isActive}
										<span class="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-400">Inactive</span>
									{/if}
								</div>
								<div class="text-xs text-surface-500">/bookings/{et.slug} &middot; {et.bookingCount} booking{et.bookingCount === 1 ? '' : 's'}</div>
							</div>
							<div class="flex items-center gap-1">
								<button onclick={() => copyLink(et.slug)} title="Copy link" class="rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" /><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" /></svg>
								</button>
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
					{/each}
				</div>
			{/if}
		</div>

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
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-surface-200 text-xs text-surface-500 dark:border-surface-800">
								<th class="px-4 py-2 font-medium">Event</th>
								<th class="px-4 py-2 font-medium">Invitee</th>
								<th class="px-4 py-2 font-medium">When</th>
								<th class="px-4 py-2 font-medium"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-200 dark:divide-surface-800">
							{#each data.upcomingBookings as b (b.id)}
								<tr class="hover:bg-surface-50 dark:hover:bg-surface-800/50">
									<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{b.eventTypeTitle}</td>
									<td class="px-4 py-2">
										<div class="text-surface-900 dark:text-surface-100">{b.inviteeName}</div>
										<div class="text-xs text-surface-500">{b.inviteeEmail}</div>
									</td>
									<td class="px-4 py-2 text-surface-700 dark:text-surface-300">{formatTime(b.startTime, b.timezone)}</td>
									<td class="px-4 py-2">
										<button
											onclick={() => cancelBooking(b.id)}
											disabled={cancelling === b.id}
											class="text-xs text-red-600 hover:text-red-500 disabled:opacity-50 dark:text-red-400"
										>
											{cancelling === b.id ? 'Cancelling...' : 'Cancel'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
							<p class="mt-1 text-xs text-surface-500">Without it, availability is based on working hours (Mon-Fri 9-5) and existing bookings.</p>
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

<EventTypeForm open={showForm} onclose={() => { showForm = false; }} eventType={editingEventType} />
