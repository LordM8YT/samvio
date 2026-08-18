<script lang="ts">
  import { Bell, Clock3, Home, PlusSquare, Search, Settings, ShieldCheck, UserRound } from '@lucide/svelte';
  import { page } from '$app/state';
  import InviteAction from '$lib/components/InviteAction.svelte';
  let { children, user } = $props();
  const items = $derived([
    { href: '/', label: 'Hjem', icon: Home },
    { href: '/sok', label: 'Søk', icon: Search },
    { href: '/historikk', label: 'Historikk', icon: Clock3 },
    { href: '/?opprett=1', label: 'Opprett', icon: PlusSquare },
    { href: '/varsler', label: 'Varsler', icon: Bell },
    { href: '/profil', label: 'Profil', icon: UserRound },
    { href: '/innstillinger', label: 'Innstillinger', icon: Settings },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : [])
  ]);
  const mobileItems = $derived(items.filter((item) => item.href !== '/historikk'));
  const active = (href: string) => href === '/' ? page.url.pathname === '/' : href.startsWith('/?') ? false : page.url.pathname.startsWith(href);
</script>

<aside class="main-nav"><a class="wordmark" href="/" aria-label="Samvio hjem"><span class="brand-mark">S</span><span>Samvio</span></a><nav aria-label="Hovedmeny">{#each items as item}<a aria-label={item.label} class:active={active(item.href)} href={item.href}><item.icon size={25} strokeWidth={active(item.href) ? 2.5 : 1.8}/><span>{item.label}</span></a>{/each}<InviteAction username={user?.username} realName={user?.realName}/></nav><footer class="nav-footer"><div><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></div><small>© 2026 Samvio</small></footer></aside>
<header class="mobile-header"><a class="wordmark" href="/">Samvio</a><a href="/historikk" aria-label="Historikk"><Clock3 size={23}/></a></header>
<div class="shell-content">{@render children()}<footer class="mobile-footer"><nav aria-label="Informasjon"><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></nav><small>© 2026 Samvio</small></footer></div>
<nav class="mobile-nav" aria-label="Mobilmeny">{#each mobileItems as item}<a class:active={active(item.href)} href={item.href} aria-label={item.label} title={item.label}><item.icon size={24} strokeWidth={active(item.href) ? 2.5 : 1.8}/></a>{/each}<InviteAction username={user?.username} realName={user?.realName} compact/></nav>

<style>
  .shell-content{min-height:100vh;margin-left:244px}.mobile-nav a.active{color:#315d49;background:#edf1ee}.nav-footer{margin-top:auto;padding:18px 12px 4px;color:#858984}.nav-footer div{display:flex;flex-wrap:wrap;gap:7px 12px}.nav-footer a{font-size:10px}.nav-footer a:hover{color:#315d49;text-decoration:underline}.nav-footer small{display:block;margin-top:12px;font-size:9px;text-transform:uppercase;letter-spacing:.06em}.mobile-footer{display:none}@media(max-width:1160px){.shell-content{margin-left:74px}.nav-footer{display:none}}@media(max-width:700px){.shell-content{margin-left:0;padding-top:calc(52px + env(safe-area-inset-top));padding-bottom:calc(58px + env(safe-area-inset-bottom))}.mobile-footer{display:grid;gap:14px;padding:28px 18px calc(22px + env(safe-area-inset-bottom));border-top:1px solid #e4e0d8;background:#f7f4ee;color:#787d78}.mobile-footer nav{display:flex;flex-wrap:wrap;gap:10px 18px}.mobile-footer a{font-size:11px}.mobile-footer small{font-size:10px}}
  .mobile-nav a{flex:1;min-width:38px;max-width:48px}
</style>
