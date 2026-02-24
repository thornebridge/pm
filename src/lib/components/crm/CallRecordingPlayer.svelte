<script lang="ts">
	interface Props {
		recordingUrl: string;
	}
	let { recordingUrl }: Props = $props();
	let playing = $state(false);
	let audioEl: HTMLAudioElement | undefined = $state();

	function toggle() {
		if (!audioEl) return;
		if (playing) {
			audioEl.pause();
			playing = false;
		} else {
			audioEl.play();
			playing = true;
		}
	}
</script>

<span class="inline-flex items-center gap-1">
	<button
		onclick={toggle}
		class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400 transition-colors"
		title={playing ? 'Pause recording' : 'Play recording'}
	>
		{#if playing}
			<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
			</svg>
		{:else}
			<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
			</svg>
		{/if}
		Recording
	</button>
	<audio bind:this={audioEl} src={recordingUrl} onended={() => (playing = false)} preload="none"></audio>
</span>
