<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	let { form } = $props();
	let loading = $state(false);
	let showInvite = $state(false);
	let inviteCode = $state('');
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
	<div class="w-full max-w-xs">
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="space-y-3"
		>
			{#if form?.error}
				<p class="rounded px-3 py-1.5 text-xs text-red-400/70">{form.error}</p>
			{/if}

			<div>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					placeholder="Email"
					value={form?.email ?? ''}
					class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
				/>
			</div>

			<div>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					placeholder="Password"
					class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-500 transition hover:text-neutral-300 disabled:opacity-40"
			>
				{loading ? '...' : 'Continue'}
			</button>
		</form>

		<div class="mt-6 text-center">
			{#if !showInvite}
				<button
					onclick={() => (showInvite = true)}
					class="text-[11px] text-neutral-800 transition hover:text-neutral-600"
				>
					code
				</button>
			{:else}
				<div class="flex gap-2">
					<input
						bind:value={inviteCode}
						placeholder="Enter code"
						onkeydown={(e) => { if (e.key === 'Enter' && inviteCode.trim()) goto(`/invite/${inviteCode.trim()}`); }}
						class="flex-1 rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-neutral-600"
					/>
					<button
						onclick={() => { if (inviteCode.trim()) goto(`/invite/${inviteCode.trim()}`); }}
						disabled={!inviteCode.trim()}
						class="rounded border border-neutral-800/60 bg-neutral-900 px-3 py-2 text-sm text-neutral-500 transition hover:text-neutral-300 disabled:opacity-40"
					>
						Go
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
