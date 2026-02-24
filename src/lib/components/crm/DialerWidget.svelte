<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { formatPhoneNumber, formatCallDuration } from '$lib/utils/phone.js';
	import {
		getDialerState,
		initClient,
		makeCall,
		hangup,
		toggleMute,
		sendDtmf,
		answerCall,
		rejectCall,
		openDialer,
		closeDialer,
		setAudioElement,
		destroy
	} from '$lib/stores/dialer.svelte.js';

	const state = getDialerState();

	let dialInput = $state('');
	let showKeypad = $state(false);
	let audioEl: HTMLAudioElement | undefined = $state();

	const keypadKeys = [
		['1', '2', '3'],
		['4', '5', '6'],
		['7', '8', '9'],
		['*', '0', '#']
	];

	let mode = $derived(
		state.incomingCall ? 'incoming' :
		state.callState !== 'idle' ? 'incall' :
		state.dialerOpen ? 'dialer' : 'minimized'
	);

	onMount(() => {
		initClient();
		if (audioEl) setAudioElement(audioEl);
	});

	onDestroy(() => {
		destroy();
	});

	function handleDial() {
		if (dialInput.trim()) {
			makeCall(dialInput.trim());
			dialInput = '';
		}
	}

	function handleKeypadPress(key: string) {
		if (state.callState === 'active') {
			sendDtmf(key);
		} else {
			dialInput += key;
		}
	}
</script>

<!-- Hidden audio element for remote media -->
<audio bind:this={audioEl} autoplay style="display:none"></audio>

<!-- Minimized: floating phone button -->
{#if mode === 'minimized'}
	<button
		onclick={() => openDialer()}
		class="fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-500 hover:shadow-xl active:scale-95"
		title="Open dialer"
		transition:fade={{ duration: 150 }}
	>
		<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
		</svg>
	</button>
{/if}

<!-- Dialer pad -->
{#if mode === 'dialer'}
	<div
		class="fixed bottom-6 right-6 z-[60] w-72 rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-800">
			<span class="text-sm font-medium text-surface-900 dark:text-surface-100">Dialer</span>
			<div class="flex items-center gap-2">
				{#if state.clientReady}
					<span class="h-2 w-2 rounded-full bg-green-500" title="Connected"></span>
				{:else}
					<span class="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Connecting..."></span>
				{/if}
				<button onclick={() => closeDialer()} class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
					<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Number input -->
		<div class="p-4">
			<input
				type="tel"
				bind:value={dialInput}
				placeholder="Enter phone number"
				onkeydown={(e) => { if (e.key === 'Enter') handleDial(); }}
				class="w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-center text-lg tracking-wider text-surface-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			/>

			<!-- Keypad toggle -->
			<button
				onclick={() => (showKeypad = !showKeypad)}
				class="mt-2 w-full text-center text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
			>{showKeypad ? 'Hide keypad' : 'Show keypad'}</button>

			<!-- Keypad -->
			{#if showKeypad}
				<div class="mt-2 grid grid-cols-3 gap-1.5" transition:fly={{ y: -10, duration: 150 }}>
					{#each keypadKeys as row}
						{#each row as key}
							<button
								onclick={() => handleKeypadPress(key)}
								class="rounded-md bg-surface-100 py-2.5 text-sm font-medium text-surface-900 transition-colors hover:bg-surface-200 active:bg-surface-300 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700 dark:active:bg-surface-600"
							>{key}</button>
						{/each}
					{/each}
				</div>
			{/if}

			{#if state.error}
				<p class="mt-2 text-xs text-red-500">{state.error}</p>
			{/if}

			<!-- Call button -->
			<button
				onclick={handleDial}
				disabled={!dialInput.trim() || !state.clientReady}
				class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50"
			>
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
				</svg>
				Call
			</button>
		</div>
	</div>
{/if}

<!-- Incoming call -->
{#if mode === 'incoming' && state.incomingCall}
	<div
		class="fixed bottom-6 right-6 z-[60] w-80 rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div class="p-5 text-center">
			<!-- Animated ring indicator -->
			<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
				<svg class="h-7 w-7 animate-pulse text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
					<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
				</svg>
			</div>

			<p class="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Incoming Call</p>
			<p class="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">
				{state.incomingCall.contactName || formatPhoneNumber(state.incomingCall.callerNumber)}
			</p>
			{#if state.incomingCall.contactName}
				<p class="text-sm text-surface-500">{formatPhoneNumber(state.incomingCall.callerNumber)}</p>
			{/if}

			<div class="mt-4 flex gap-3">
				<button
					onclick={rejectCall}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
				>
					<svg class="h-4 w-4 rotate-135" viewBox="0 0 20 20" fill="currentColor">
						<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
					</svg>
					Decline
				</button>
				<button
					onclick={answerCall}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
				>
					<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
					</svg>
					Answer
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Active call -->
{#if mode === 'incall'}
	<div
		class="fixed bottom-6 right-6 z-[60] w-80 rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div class="p-5 text-center">
			<!-- Call state indicator -->
			{#if state.callState === 'connecting'}
				<p class="text-xs font-medium uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Connecting...</p>
			{:else if state.callState === 'ringing'}
				<p class="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Ringing...</p>
			{:else if state.callState === 'active'}
				<p class="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">{formatCallDuration(state.callDuration)}</p>
			{:else if state.callState === 'ending'}
				<p class="text-xs font-medium uppercase tracking-wider text-surface-400">Call ended</p>
			{/if}

			<!-- Contact info -->
			<p class="mt-1 text-lg font-semibold text-surface-900 dark:text-surface-100">
				{state.currentContactName || formatPhoneNumber(state.currentNumber)}
			</p>
			{#if state.currentContactName}
				<p class="text-sm text-surface-500">{formatPhoneNumber(state.currentNumber)}</p>
			{/if}

			{#if state.error}
				<p class="mt-2 text-xs text-red-500">{state.error}</p>
			{/if}

			<!-- Controls -->
			{#if state.callState !== 'ending'}
				<div class="mt-4 flex items-center justify-center gap-3">
					<!-- Mute -->
					<button
						onclick={toggleMute}
						class="flex h-10 w-10 items-center justify-center rounded-full transition-colors {state.isMuted ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'}"
						title={state.isMuted ? 'Unmute' : 'Mute'}
					>
						{#if state.isMuted}
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						{:else}
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />
							</svg>
						{/if}
					</button>

					<!-- Keypad -->
					<button
						onclick={() => (showKeypad = !showKeypad)}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 text-surface-600 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
						title="Keypad"
					>
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 15.5v-11zM4.5 4a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm4 0a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm4 0a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z" />
						</svg>
					</button>

					<!-- Hangup -->
					<button
						onclick={hangup}
						class="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
						title="Hang up"
					>
						<svg class="h-5 w-5 rotate-135" viewBox="0 0 20 20" fill="currentColor">
							<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
						</svg>
					</button>
				</div>

				<!-- In-call keypad -->
				{#if showKeypad}
					<div class="mt-3 grid grid-cols-3 gap-1.5" transition:fly={{ y: -10, duration: 150 }}>
						{#each keypadKeys as row}
							{#each row as key}
								<button
									onclick={() => handleKeypadPress(key)}
									class="rounded-md bg-surface-100 py-2 text-sm font-medium text-surface-900 transition-colors hover:bg-surface-200 active:bg-surface-300 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700"
								>{key}</button>
							{/each}
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
