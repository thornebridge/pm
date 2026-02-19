<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-md p-6">
	<h1 class="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-100">Settings</h1>

	<div class="mb-6 rounded-md border border-surface-300 p-4 dark:border-surface-800">
		<p class="text-sm text-surface-700 dark:text-surface-300">{data.user?.name}</p>
		<p class="text-xs text-surface-500">{data.user?.email}</p>
		<p class="text-xs text-surface-400 mt-1 dark:text-surface-600">Role: {data.user?.role}</p>
	</div>

	<button
		onclick={logout}
		class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:border-red-400 hover:text-red-600 dark:border-surface-700 dark:text-surface-400 dark:hover:border-red-800 dark:hover:text-red-400"
	>
		Sign out
	</button>
</div>
