<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	let { form } = $props();
	let loading = $state(false);
	let showInvite = $state(false);
	let inviteCode = $state('');
</script>

<svelte:head>
	<title>Sign in</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<h1 class="text-center text-lg font-medium text-surface-900 dark:text-surface-100">Sign in</h1>

			{#if form?.error}
				<p class="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{/if}

			<div>
				<label for="email" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>

			<div>
				<label for="password" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
			>
				{loading ? 'Signing in...' : 'Sign in'}
			</button>
		</form>

		<div class="mt-4 text-center">
			{#if !showInvite}
				<button
					onclick={() => (showInvite = true)}
					class="text-sm text-brand-500 hover:text-brand-400"
				>
					Have an invite code?
				</button>
			{:else}
				<div class="flex gap-2">
					<input
						bind:value={inviteCode}
						placeholder="Enter invite code"
						onkeydown={(e) => { if (e.key === 'Enter' && inviteCode.trim()) goto(`/invite/${inviteCode.trim()}`); }}
						class="flex-1 rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
					/>
					<button
						onclick={() => { if (inviteCode.trim()) goto(`/invite/${inviteCode.trim()}`); }}
						disabled={!inviteCode.trim()}
						class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
					>
						Join
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
