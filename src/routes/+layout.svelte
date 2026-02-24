<script>
	import '../app.css';
	import '$lib/stores/theme.js';
	import Toast from '$lib/components/ui/Toast.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#2d4f3e" />
</svelte:head>

{@render children()}
<Toast />
