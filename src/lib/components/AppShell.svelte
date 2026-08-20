<script lang="ts">
  import { Bell, Clock3, Home, PlusSquare, Search, Settings, ShieldCheck, UserRound } from '@lucide/svelte';
  import { page } from '$app/state';
  let { children, user } = $props();
  const items = $derived([
    { href: '/', label: 'Feed', icon: Home },
    { href: '/sok', label: 'Utforsk', icon: Search },
    { href: '/varsler', label: 'Varsler', icon: Bell },
    { href: '/profil', label: 'Profil', icon: UserRound },
    { href: '/historikk', label: 'Tidligere innlegg', icon: Clock3 },
    { href: '/innstillinger', label: 'Innstillinger', icon: Settings },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : [])
  ]);
  const mobileItems = $derived([
    { href: '/', label: 'Feed', icon: Home, primary: false },
    { href: '/sok', label: 'Utforsk', icon: Search, primary: false },
    { href: '/?opprett=1', label: 'Del', icon: PlusSquare, primary: true },
    { href: '/varsler', label: 'Varsler', icon: Bell, primary: false },
    { href: '/profil', label: 'Profil', icon: UserRound, primary: false }
  ]);
  const active = (href: string) => href === '/' ? page.url.pathname === '/' : href.startsWith('/?') ? false : page.url.pathname.startsWith(href);
</script>

<aside class="main-nav"><a class="wordmark" href="/" aria-label="Samvio hjem"><span>Samvio</span></a><nav aria-label="Hovedmeny">{#each items as item}<a aria-label={item.label} class:active={active(item.href)} href={item.href}><item.icon size={21} strokeWidth={active(item.href) ? 2.15 : 1.65}/><span>{item.label}</span></a>{/each}<a class="desktop-create" href="/?opprett=1"><PlusSquare size={20}/>Del et øyeblikk</a></nav><footer class="nav-footer"><div><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></div><small>© 2026 Samvio</small></footer></aside>
<header class="mobile-header"><a class="wordmark" href="/">Samvio</a><a href="/historikk" aria-label="Historikk"><Clock3 size={23}/></a></header>
<div class="shell-content">{@render children()}<footer class="mobile-footer"><nav aria-label="Informasjon"><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></nav><small>© 2026 Samvio</small></footer></div>
<nav class="mobile-nav" aria-label="Mobilmeny">{#each mobileItems as item}<a class:active={active(item.href)} class:primary={item.primary} href={item.href} aria-label={item.label} title={item.label}><item.icon size={item.primary ? 25 : 22} strokeWidth={active(item.href) ? 2.25 : 1.7}/><span>{item.label}</span></a>{/each}</nav>

<style>
  .shell-content{min-height:100vh;margin-left:224px}.desktop-create{justify-content:center!important;margin-top:18px!important;background:#1e3a2f!important;color:#f8f5ef!important;font-size:13px!important;font-weight:600!important}.mobile-nav a.active{color:#1e3a2f}.nav-footer{margin-top:auto;padding:18px 12px 4px;color:#858984}.nav-footer div{display:flex;flex-wrap:wrap;gap:7px 12px}.nav-footer a{font-size:10px}.nav-footer a:hover{color:#1e3a2f;text-decoration:underline}.nav-footer small{display:block;margin-top:12px;font-size:9px;text-transform:uppercase;letter-spacing:.06em}.mobile-footer{display:none}@media(max-width:1160px){.shell-content{margin-left:74px}.nav-footer,.desktop-create{display:none!important}}@media(max-width:700px){.shell-content{margin-left:0;padding-top:calc(52px + env(safe-area-inset-top));padding-bottom:calc(72px + env(safe-area-inset-bottom))}.mobile-footer{display:grid;gap:14px;padding:28px 18px calc(22px + env(safe-area-inset-bottom));border-top:1px solid #e4e0d8;background:#f7f4ee;color:#787d78}.mobile-footer nav{display:flex;flex-wrap:wrap;gap:10px 18px}.mobile-footer a{font-size:11px}.mobile-footer small{font-size:10px}}
  .mobile-nav a{display:flex!important;flex:1;min-width:52px;max-width:68px;height:55px!important;gap:3px;align-items:center;justify-content:center;flex-direction:column;border-radius:0!important;font-size:9px;color:#777}.mobile-nav a span{display:block}.mobile-nav a.primary{width:48px;min-width:48px;max-width:48px;height:48px!important;margin-top:-18px;border-radius:16px!important;background:#1e3a2f;color:#f8f5ef;box-shadow:0 8px 20px #1e3a2f35}.mobile-nav a.primary span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>
