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
	<h1 class="mb-6 text-lg font-semibold text-slate-100">Settings</h1>

	<div class="mb-6 rounded-md border border-slate-800 p-4">
		<p class="text-sm text-slate-300">{data.user?.name}</p>
		<p class="text-xs text-slate-500">{data.user?.email}</p>
		<p class="text-xs text-slate-600 mt-1">Role: {data.user?.role}</p>
	</div>

	<button
		onclick={logout}
		class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:border-red-800 hover:text-red-400"
	>
		Sign out
	</button>
</div>
