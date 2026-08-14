<script lang="ts">import '../styles/app.css'; import '../styles/navigation.css'; import { page } from '$app/state'; import AppShell from '$lib/components/AppShell.svelte'; let { children, data } = $props();</script>
{#if page.url.pathname === '/login' || page.url.pathname.startsWith('/admin')} {@render children()} {:else}<AppShell user={data.user}>{@render children()}</AppShell>{/if}
