<script lang="ts">
  import { Bell, Compass, Home, Menu, MessageCircle, PlusSquare, Search, ShieldCheck, UserRound, Video } from '@lucide/svelte';
  let { data } = $props();
  const navigation = [
    { slug: '', label: 'Hjem', icon: Home }, { slug: 'sok', label: 'Søk', icon: Search },
    { slug: 'utforsk', label: 'Utforsk', icon: Compass }, { slug: 'videoer', label: 'Videoer', icon: Video },
    { slug: 'meldinger', label: 'Meldinger', icon: MessageCircle }, { slug: 'varsler', label: 'Varsler', icon: Bell },
    { slug: '?opprett=1', label: 'Opprett', icon: PlusSquare }, { slug: 'profil', label: 'Profil', icon: UserRound }
  ];
  const copy: Record<string, { title: string; intro: string; emptyTitle: string; emptyText: string }> = {
    utforsk: { title: 'Utforsk', intro: 'Finn fellesskap du selv velger å følge.', emptyTitle: 'Fellesskap kommer her', emptyText: 'Vi bygger temabaserte rom uten anbefalingsalgoritmer.' },
    videoer: { title: 'Videoer', intro: 'Videoer fra menneskene og fellesskapene du følger.', emptyTitle: 'Ingen videoer ennå', emptyText: 'Dette er vanlige videoinnlegg — ikke direktesending.' },
    meldinger: { title: 'Meldinger', intro: 'Private samtaler med tydelige trygghetsgrenser.', emptyTitle: 'Ingen samtaler ennå', emptyText: 'Meldinger åpnes først når sikkerhetsreglene og relasjonskontrollen er på plass.' },
    varsler: { title: 'Varsler', intro: 'Nye hendelser vises i kronologisk rekkefølge.', emptyTitle: 'Du har ingen nye varsler', emptyText: 'Her kommer forespørsler, kommentarer og andre hendelser.' }
  };
</script>

<svelte:head><title>{data.section === 'profil' ? 'Profil' : data.section === 'sok' ? 'Søk' : copy[data.section].title} – Samvio</title></svelte:head>

<aside class="main-nav">
  <a class="wordmark" href="/" aria-label="Samvio hjem"><span class="camera-mark"></span><span>Samvio</span></a>
  <nav aria-label="Hovedmeny">
    {#each navigation as item}
      <a aria-label={item.label} class:active={item.slug === data.section || (item.slug === '' && data.section === '')} href={item.slug.startsWith('?') ? `/${item.slug}` : `/${item.slug}`}><item.icon size={25}/><span>{item.label}</span></a>
    {/each}
  </nav>
  <button class="more"><Menu size={25}/><span>Mer</span></button>
</aside>

<header class="mobile-header"><a class="wordmark" href="/">Samvio</a><div><a href="/varsler" aria-label="Varsler"><Bell size={23}/></a><a href="/meldinger" aria-label="Meldinger"><MessageCircle size={23}/></a></div></header>

<main class="section-layout">
  <div class="section-shell">
    {#if data.section === 'sok'}
      <h1>Søk</h1><p class="section-intro">Finn ekte, verifiserte mennesker på Samvio.</p>
      <form class="search-form" method="GET"><input name="q" value={data.query} placeholder="Søk etter navn eller brukernavn" aria-label="Søk"/><button>Søk</button></form>
      {#if data.query && data.results.length}
        <div class="search-results">{#each data.results as person}<div class="person-row"><span><UserRound size={21}/></span><div><strong>{person.realName}</strong><small>@{person.username}</small></div></div>{/each}</div>
      {:else if data.query}
        <div class="section-card section-empty"><Search size={34}/><h2>Ingen treff</h2><p>Vi fant ingen profiler som matcher «{data.query}».</p></div>
      {/if}
    {:else if data.section === 'profil'}
      <h1>Profil</h1><p class="section-intro">Din konto og medlemskap.</p>
      <section class="section-card"><div class="profile-details"><UserRound size={42}/><p><strong>{data.user.realName}</strong><br/><span>@{data.user.username}</span></p><p>{data.user.email}</p><p><ShieldCheck size={16}/> Lokal testkonto</p></div><div class="profile-actions"><a href="/priser">Se abonnement</a><form method="POST" action="?/logout"><button>Logg ut</button></form></div></section>
    {:else}
      {@const section = copy[data.section]}
      <h1>{section.title}</h1><p class="section-intro">{section.intro}</p>
      <section class="section-card section-empty">{#if data.section === 'utforsk'}<Compass size={36}/>{:else if data.section === 'videoer'}<Video size={36}/>{:else if data.section === 'meldinger'}<MessageCircle size={36}/>{:else}<Bell size={36}/>{/if}<h2>{section.emptyTitle}</h2><p>{section.emptyText}</p></section>
    {/if}
  </div>
</main>

<nav class="mobile-nav" aria-label="Mobilmeny"><a href="/" aria-label="Hjem"><Home size={24}/></a><a href="/sok" aria-label="Søk"><Search size={24}/></a><a href="/?opprett=1" aria-label="Opprett"><PlusSquare size={24}/></a><a href="/videoer" aria-label="Videoer"><Video size={24}/></a><a href="/profil" aria-label="Profil"><UserRound size={24}/></a></nav>
