<script lang="ts">
	import { unreadCount, refreshUnreadCount } from '$lib/stores/notifications.js';
	import NotificationPanel from './NotificationPanel.svelte';
	import { onMount } from 'svelte';

	let showPanel = $state(false);

	onMount(() => {
		refreshUnreadCount();
		const interval = setInterval(refreshUnreadCount, 30000);
		return () => clearInterval(interval);
	});
</script>

<div class="relative">
	<button
		onclick={() => (showPanel = !showPanel)}
		class="relative rounded-md p-1 text-surface-500 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
		title="Notifications"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
			<path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
		</svg>
		{#if $unreadCount > 0}
			<span class="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
				{$unreadCount > 9 ? '9+' : $unreadCount}
			</span>
		{/if}
	</button>

	{#if showPanel}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-40" onclick={() => (showPanel = false)} onkeydown={() => {}}></div>
		<div class="absolute bottom-full left-0 z-50 mb-2 w-72">
			<NotificationPanel onclose={() => (showPanel = false)} />
		</div>
	{/if}
</div>
