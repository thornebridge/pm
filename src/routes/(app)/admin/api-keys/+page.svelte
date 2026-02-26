<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	interface ApiKey {
		id: string;
		name: string;
		keyPrefix: string;
		userId: string;
		userName: string;
		lastUsedAt: number | null;
		createdAt: number;
	}

	let keys = $state<ApiKey[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let newKeyName = $state('');
	let revealedKey = $state<string | null>(null);

	async function loadKeys() {
		try {
			keys = await api<ApiKey[]>('/api/admin/api-keys');
		} catch (err: any) {
			showToast(err.message, 'error');
		} finally {
			loading = false;
		}
	}

	async function createKey() {
		if (!newKeyName.trim()) return;
		creating = true;
		try {
			const result = await api<{ id: string; name: string; key: string; keyPrefix: string }>(
				'/api/admin/api-keys',
				{ method: 'POST', body: JSON.stringify({ name: newKeyName.trim() }) }
			);
			revealedKey = result.key;
			newKeyName = '';
			await loadKeys();
			showToast('API key created — copy it now, it won\'t be shown again', 'success');
		} catch (err: any) {
			showToast(err.message, 'error');
		} finally {
			creating = false;
		}
	}

	async function revokeKey(keyId: string) {
		if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
		try {
			await api(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' });
			keys = keys.filter((k) => k.id !== keyId);
			showToast('API key revoked', 'success');
		} catch (err: any) {
			showToast(err.message, 'error');
		}
	}

	function copyKey() {
		if (revealedKey) {
			navigator.clipboard.writeText(revealedKey);
			showToast('Copied to clipboard', 'success');
		}
	}

	function formatDate(ts: number | null) {
		if (!ts) return '—';
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	loadKeys();
</script>

<div class="max-w-4xl mx-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold">API Keys</h1>
			<p class="text-sm text-[var(--text-secondary)] mt-1">
				Manage API keys for external integrations (MCP servers, automations).
			</p>
		</div>
		<a href="/admin" class="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
			&larr; Back to Admin
		</a>
	</div>

	{#if revealedKey}
		<div class="bg-[var(--bg-success)]/10 border border-[var(--border-success)] rounded-lg p-4 mb-6">
			<p class="text-sm font-medium mb-2">New API key created — copy it now:</p>
			<div class="flex items-center gap-2">
				<code class="flex-1 bg-[var(--bg-primary)] px-3 py-2 rounded text-sm font-mono select-all break-all">
					{revealedKey}
				</code>
				<button onclick={copyKey} class="btn btn-sm btn-secondary whitespace-nowrap">Copy</button>
				<button onclick={() => (revealedKey = null)} class="btn btn-sm btn-ghost">Dismiss</button>
			</div>
			<p class="text-xs text-[var(--text-secondary)] mt-2">
				This key will not be shown again. Store it securely.
			</p>
		</div>
	{/if}

	<div class="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4 mb-6">
		<h2 class="text-sm font-medium mb-3">Create New Key</h2>
		<form onsubmit={(e) => { e.preventDefault(); createKey(); }} class="flex gap-2">
			<input
				type="text"
				bind:value={newKeyName}
				placeholder="Key name (e.g. Claude MCP)"
				class="input flex-1"
				disabled={creating}
			/>
			<button type="submit" class="btn btn-primary" disabled={creating || !newKeyName.trim()}>
				{creating ? 'Creating...' : 'Create Key'}
			</button>
		</form>
	</div>

	{#if loading}
		<p class="text-sm text-[var(--text-secondary)]">Loading...</p>
	{:else if keys.length === 0}
		<p class="text-sm text-[var(--text-secondary)]">No API keys yet.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[var(--border-primary)]">
						<th class="text-left py-2 px-3 font-medium">Name</th>
						<th class="text-left py-2 px-3 font-medium">Prefix</th>
						<th class="text-left py-2 px-3 font-medium">User</th>
						<th class="text-left py-2 px-3 font-medium">Last Used</th>
						<th class="text-left py-2 px-3 font-medium">Created</th>
						<th class="py-2 px-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each keys as key (key.id)}
						<tr class="border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)]">
							<td class="py-2 px-3">{key.name}</td>
							<td class="py-2 px-3">
								<code class="text-xs bg-[var(--bg-primary)] px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
							</td>
							<td class="py-2 px-3">{key.userName}</td>
							<td class="py-2 px-3 text-[var(--text-secondary)]">{formatDate(key.lastUsedAt)}</td>
							<td class="py-2 px-3 text-[var(--text-secondary)]">{formatDate(key.createdAt)}</td>
							<td class="py-2 px-3 text-right">
								<button
									onclick={() => revokeKey(key.id)}
									class="text-xs text-red-400 hover:text-red-300"
								>
									Revoke
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
