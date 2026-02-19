<script>
	import '../app.css';
	import '$lib/stores/theme.js';
	import Toast from '$lib/components/ui/Toast.svelte';
	let { children } = $props();
</script>

{@render children()}
<Toast />
