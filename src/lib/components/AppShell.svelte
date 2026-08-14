<script lang="ts">
  import { Clock3, Home, PlusSquare, Search, UserRound } from '@lucide/svelte';
  import { page } from '$app/state';
  let { children } = $props();
  const items = [
    { href: '/', label: 'Hjem', icon: Home },
    { href: '/sok', label: 'Søk', icon: Search },
    { href: '/historikk', label: 'Historikk', icon: Clock3 },
    { href: '/?opprett=1', label: 'Opprett', icon: PlusSquare },
    { href: '/profil', label: 'Profil', icon: UserRound }
  ];
  const active = (href: string) => href === '/' ? page.url.pathname === '/' : href.startsWith('/?') ? false : page.url.pathname.startsWith(href);
</script>

<aside class="main-nav"><a class="wordmark" href="/" aria-label="Samvio hjem"><span class="brand-mark">S</span><span>Samvio</span></a><nav aria-label="Hovedmeny">{#each items as item}<a aria-label={item.label} class:active={active(item.href)} href={item.href}><item.icon size={25} strokeWidth={active(item.href) ? 2.5 : 1.8}/><span>{item.label}</span></a>{/each}</nav></aside>
<header class="mobile-header"><a class="wordmark" href="/">Samvio</a><a href="/historikk" aria-label="Historikk"><Clock3 size={23}/></a></header>
<div class="shell-content">{@render children()}</div>
<nav class="mobile-nav" aria-label="Mobilmeny">{#each items as item}<a class:active={active(item.href)} href={item.href} aria-label={item.label}><item.icon size={24} strokeWidth={active(item.href) ? 2.5 : 1.8}/></a>{/each}</nav>

<style>
  .shell-content{min-height:100vh;margin-left:244px}.mobile-nav a.active{color:#315d49;background:#edf1ee}@media(max-width:1160px){.shell-content{margin-left:74px}}@media(max-width:700px){.shell-content{margin-left:0;padding-top:calc(52px + env(safe-area-inset-top));padding-bottom:calc(58px + env(safe-area-inset-bottom))}}
</style>
