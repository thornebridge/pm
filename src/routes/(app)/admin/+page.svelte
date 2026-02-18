<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let email = $state('');
	let role = $state<'member' | 'admin'>('member');
	let creating = $state(false);

	async function createInvite() {
		creating = true;
		try {
			await api('/api/admin/invites', {
				method: 'POST',
				body: JSON.stringify({ email: email || undefined, role })
			});
			email = '';
			await invalidateAll();
			showToast('Invite created');
		} catch {
			showToast('Failed to create invite', 'error');
		} finally {
			creating = false;
		}
	}

	async function deleteInvite(id: string) {
		try {
			await api('/api/admin/invites', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to delete invite', 'error');
		}
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Admin - Invites</title>
</svelte:head>

<div class="mx-auto max-w-xl p-6">
	<h1 class="mb-6 text-lg font-semibold text-slate-100">Invite Management</h1>

	<form
		onsubmit={(e) => { e.preventDefault(); createInvite(); }}
		class="mb-6 flex items-end gap-2"
	>
		<div class="flex-1">
			<label for="email" class="mb-1 block text-xs text-slate-400">Email (optional)</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				placeholder="user@example.com"
				class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
			/>
		</div>
		<select
			bind:value={role}
			class="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
		>
			<option value="member">Member</option>
			<option value="admin">Admin</option>
		</select>
		<button
			type="submit"
			disabled={creating}
			class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
		>
			Create invite
		</button>
	</form>

	<div class="space-y-2">
		{#each data.invites as invite}
			<div class="flex items-center justify-between rounded-md border border-slate-800 px-4 py-3">
				<div>
					<p class="font-mono text-xs text-slate-400">{invite.token}</p>
					<div class="mt-1 flex gap-3 text-xs text-slate-500">
						{#if invite.email}
							<span>{invite.email}</span>
						{/if}
						<span>{invite.role}</span>
						{#if invite.usedAt}
							<span class="text-green-500">Used</span>
						{:else if invite.expiresAt < Date.now()}
							<span class="text-red-400">Expired</span>
						{:else}
							<span>Expires {formatDate(invite.expiresAt)}</span>
						{/if}
					</div>
				</div>
				{#if !invite.usedAt}
					<button
						onclick={() => deleteInvite(invite.id)}
						class="text-xs text-slate-500 hover:text-red-400"
					>
						Delete
					</button>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-slate-500">No invites yet.</p>
		{/each}
	</div>
</div>
