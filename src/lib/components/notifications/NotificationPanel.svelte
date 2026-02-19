<script lang="ts">
	import { onMount } from 'svelte';
	import { refreshUnreadCount } from '$lib/stores/notifications.js';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

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

	onMount(async () => {
		try {
			const res = await fetch('/api/notifications?limit=10');
			if (res.ok) {
				const data = await res.json();
				notifications = data.items ?? data;
			}
		} finally {
			loading = false;
		}
	});

	async function markAllRead() {
		await fetch('/api/notifications', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'mark_all_read' })
		});
		notifications = notifications.map((n) => ({ ...n, read: true }));
		refreshUnreadCount();
	}

	async function markRead(id: string) {
		await fetch('/api/notifications', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'mark_read', id })
		});
		notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
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

<div class="max-h-96 overflow-y-auto rounded-lg border border-surface-300 bg-surface-50 shadow-xl dark:border-surface-700 dark:bg-surface-900">
	<div class="flex items-center justify-between border-b border-surface-300 px-3 py-2 dark:border-surface-800">
		<span class="text-xs font-semibold text-surface-900 dark:text-surface-100">Notifications</span>
		<div class="flex gap-2">
			<button onclick={markAllRead} class="text-[10px] text-brand-600 hover:text-brand-500 dark:text-brand-400">
				Mark all read
			</button>
			<a href="/notifications" onclick={onclose} class="text-[10px] text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
				View all
			</a>
		</div>
	</div>

	{#if loading}
		<p class="p-4 text-center text-xs text-surface-500">Loading...</p>
	{:else if notifications.length === 0}
		<p class="p-4 text-center text-xs text-surface-500">No notifications</p>
	{:else}
		{#each notifications.slice(0, 10) as notif (notif.id)}
			<a
				href={notif.url || '#'}
				onclick={() => { if (!notif.read) markRead(notif.id); onclose(); }}
				class="block border-b border-surface-200 px-3 py-2 transition last:border-0 hover:bg-surface-100 dark:border-surface-800/50 dark:hover:bg-surface-800/30 {notif.read ? '' : 'bg-brand-50/50 dark:bg-brand-900/10'}"
			>
				<div class="flex items-start gap-2">
					{#if !notif.read}
						<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"></span>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="text-xs font-medium text-surface-900 dark:text-surface-100">{notif.title}</p>
						{#if notif.body}
							<p class="mt-0.5 truncate text-[10px] text-surface-500">{notif.body}</p>
						{/if}
						<p class="mt-0.5 text-[10px] text-surface-400">{timeAgo(notif.createdAt)}</p>
					</div>
				</div>
			</a>
		{/each}
	{/if}
</div>
