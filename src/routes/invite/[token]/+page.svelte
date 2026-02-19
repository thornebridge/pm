<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Join</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-sm">
		{#if !data.valid}
			<div class="text-center">
				<p class="text-surface-600 dark:text-surface-400">This invite link is invalid or has expired.</p>
			</div>
		{:else}
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
				<h1 class="text-center text-lg font-medium text-surface-900 dark:text-surface-100">Create your account</h1>

				{#if form?.error}
					<p class="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{form.error}</p>
				{/if}

				<div>
					<label for="name" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Name</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						value={form?.name ?? ''}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>

				<div>
					<label for="email" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						value={form?.email ?? data.email ?? ''}
						readonly={!!data.email}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 read-only:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>

				<div>
					<label for="password" class="mb-1 block text-sm text-surface-600 dark:text-surface-400">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						minlength={8}
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
				>
					{loading ? 'Creating account...' : 'Create account'}
				</button>
			</form>
		{/if}
	</div>
</div>
