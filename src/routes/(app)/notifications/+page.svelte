<script lang="ts">
	import { onMount } from 'svelte';
	import { refreshUnreadCount } from '$lib/stores/notifications.js';
	import { api } from '$lib/utils/api.js';

	interface Notification {
		id: string;
		type: string;
		title: string;
		body: string | null;
		url: string | null;
		read: boolean;
		createdAt: number;
		actorName?: string;
	}

	let notifications = $state<Notification[]>([]);
	let loading = $state(true);
	let total = $state(0);
	let hasMore = $state(false);
	let loadingMore = $state(false);

	const PAGE_SIZE = 30;

	onMount(async () => {
		await loadNotifications(0);
	});

	async function loadNotifications(offset: number) {
		try {
			const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
			if (res.ok) {
				const data = await res.json();
				if (offset === 0) {
					notifications = data.items;
				} else {
					notifications = [...notifications, ...data.items];
				}
				total = data.total;
				hasMore = notifications.length < total;
			}
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	async function loadMore() {
		loadingMore = true;
		await loadNotifications(notifications.length);
	}

	async function markRead(id: string) {
		await api('/api/notifications', {
			method: 'PATCH',
			body: JSON.stringify({ action: 'mark_read', id })
		});
		notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
		refreshUnreadCount();
	}

	async function markAllRead() {
		await api('/api/notifications', {
			method: 'PATCH',
			body: JSON.stringify({ action: 'mark_all_read' })
		});
		notifications = notifications.map((n) => ({ ...n, read: true }));
		refreshUnreadCount();
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Notifications</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Notifications</h1>
		<button
			onclick={markAllRead}
			class="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400"
		>
			Mark all read
		</button>
	</div>

	{#if loading}
		<p class="text-sm text-surface-500">Loading...</p>
	{:else if notifications.length === 0}
		<p class="text-sm text-surface-500">No notifications yet.</p>
	{:else}
		<div class="space-y-1">
			{#each notifications as notif (notif.id)}
				<a
					href={notif.url || '#'}
					onclick={() => { if (!notif.read) markRead(notif.id); }}
					class="flex items-start gap-3 rounded-lg border border-surface-300 px-4 py-3 transition hover:border-surface-400 dark:border-surface-800 dark:hover:border-surface-700 {notif.read ? 'bg-surface-50 dark:bg-surface-900' : 'bg-brand-50/30 dark:bg-brand-900/10'}"
				>
					{#if !notif.read}
						<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"></span>
					{:else}
						<span class="mt-1.5 h-2 w-2 shrink-0"></span>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-surface-900 dark:text-surface-100">{notif.title}</p>
						{#if notif.body}
							<p class="mt-0.5 text-xs text-surface-500">{notif.body}</p>
						{/if}
						<p class="mt-1 text-[10px] text-surface-400">{timeAgo(notif.createdAt)}</p>
					</div>
				</a>
			{/each}
		</div>

		{#if hasMore}
			<div class="mt-4 text-center">
				<button
					onclick={loadMore}
					disabled={loadingMore}
					class="rounded-md border border-surface-300 px-4 py-1.5 text-sm text-surface-600 hover:border-surface-400 hover:text-surface-900 disabled:opacity-50 dark:border-surface-700 dark:text-surface-400 dark:hover:border-surface-600"
				>
					{loadingMore ? 'Loading...' : 'Load more'}
				</button>
			</div>
		{/if}
	{/if}
</div>
