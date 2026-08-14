<script lang="ts">import '../styles/app.css'; import '../styles/navigation.css'; import { page } from '$app/state'; import AppShell from '$lib/components/AppShell.svelte'; let { children } = $props();</script>
{#if page.url.pathname === '/login'}{@render children()}{:else}<AppShell>{@render children()}</AppShell>{/if}
