<script lang="ts">
  import { onMount } from 'svelte';
  import MicropolisView from '$lib/MicropolisView.svelte';
  import { initializeDesktop } from './desktop';
  onMount(() => { initializeDesktop().catch(error => { console.error(error); alert(String(error)); }); });
</script>
<MicropolisView />
