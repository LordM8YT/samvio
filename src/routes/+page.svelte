<script lang="ts">
  import { Bell, Compass, Heart, Home, Menu, MessageCircle, PlusSquare, Search, ShieldCheck, UserRound, Video, X } from '@lucide/svelte';
  let { data, form } = $props();
  let composerOpen = $state(false);
  let feedMarked = $state(false);
  $effect(() => { if (form?.postError || data.openComposer) composerOpen = true; });
  function observeFeedEnd(node: HTMLElement) {
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || feedMarked || !data.feedWindowEnd) return;
      feedMarked = true;
      const body = new FormData();
      body.set('feedWindowEnd', data.feedWindowEnd.toISOString());
      await fetch('?/markCaughtUp', { method: 'POST', body });
    }, { threshold: 0.7 });
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }
  const navigation = [
    { label: 'Hjem', icon: Home, active: true, href: '/' }, { label: 'Søk', icon: Search, href: '/sok' },
    { label: 'Utforsk', icon: Compass, href: '/utforsk' }, { label: 'Videoer', icon: Video, href: '/videoer' },
    { label: 'Meldinger', icon: MessageCircle, href: '/meldinger' }, { label: 'Varsler', icon: Bell, href: '/varsler' },
    { label: 'Opprett', icon: PlusSquare, action: true }, { label: 'Profil', icon: UserRound, href: '/profil' }
  ];
</script>

<svelte:head><title>Samvio – ekte øyeblikk</title><meta name="description" content="En trygg, kronologisk og algoritmefri sosial møteplass." /></svelte:head>

<div class="samvio-shell">
  <aside class="main-nav">
    <a class="wordmark" href="/" aria-label="Samvio hjem"><span class="brand-mark">S</span><span>Samvio</span></a>
    <nav aria-label="Hovedmeny">{#each navigation as item}{#if item.action}<button aria-label={item.label} onclick={() => composerOpen = true}><item.icon size={25}/><span>{item.label}</span></button>{:else}<a aria-label={item.label} class:active={item.active} href={item.href}><item.icon size={25} strokeWidth={item.active ? 2.5 : 1.8}/><span>{item.label}</span></a>{/if}{/each}</nav>
    <button class="more"><Menu size={25}/><span>Mer</span></button>
  </aside>

  <main class="feed-column">
    <header class="mobile-header"><a class="wordmark" href="/">Samvio</a><div><Bell size={23}/><MessageCircle size={23}/></div></header>
    <section class="feed-label"><div><h1>Siden sist</h1><span><i></i>Kronologisk · Ingen anbefalinger</span></div><p>{data.posts.length} nye øyeblikk fra {data.peopleCount} {data.peopleCount === 1 ? 'person' : 'personer'}.</p></section>

    {#if data.posts.length}
      <section class="post-list" aria-label="Innlegg">
        {#each data.posts as post}
          <article class="post-card">
            <header><span class="post-avatar"><UserRound size={19}/></span><div><strong>{post.authorName}</strong><small>@{post.authorUsername}</small></div><time datetime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</time></header>
            {#if post.mediaId}<img src={`/media/${post.mediaId}`} alt={post.caption || `Bilde fra ${post.authorName}`} />{/if}
            <div class="post-actions"><button aria-label="Lik"><Heart size={23}/></button><button aria-label="Kommenter"><MessageCircle size={23}/></button></div>
            {#if post.caption}<p><strong>{post.authorUsername}</strong> {post.caption}</p>{/if}
          </article>
        {/each}
      </section>
    {:else}
      <section class="empty-state"><div class="empty-icon"><ShieldCheck size={32}/></div><h2>Ingen nye øyeblikk</h2><p>Du har sett alt nytt fra menneskene du følger. Feeden fylles først når noen du har valgt å følge deler noe.</p><button class="text-action" onclick={() => composerOpen = true}>Del et øyeblikk</button></section>
    {/if}
    <div class="feed-end" use:observeFeedEnd><ShieldCheck size={17}/><div><strong>Du er ajour</strong><span>Du har sett alt nytt fra menneskene du følger.</span></div><a href="/historikk">Se tidligere innlegg</a></div>
    <nav class="mobile-nav" aria-label="Mobilmeny"><a href="/" aria-label="Hjem"><Home size={24}/></a><a href="/sok" aria-label="Søk"><Search size={24}/></a><button onclick={() => composerOpen = true} aria-label="Opprett"><PlusSquare size={24}/></button><a href="/videoer" aria-label="Videoer"><Video size={24}/></a><a href="/profil" aria-label="Profil"><UserRound size={24}/></a></nav>
  </main>

  <aside class="right-rail"><div class="account-row"><div class="profile-avatar"><UserRound size={22}/></div><div><strong>{data.user?.realName ?? 'Din profil'}</strong><span>{data.user ? `@${data.user.username}` : 'Ikke logget inn'}</span></div>{#if !data.user}<a href="/login">Logg inn</a>{/if}</div><div class="safe-note"><ShieldCheck size={20}/><p><strong>Trygg alpha.</strong><br/>Inviterte testbrukere og tydelige grenser.</p></div><div class="rail-links"><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></div><small>© 2026 SAMVIO</small></aside>
</div>

{#if composerOpen}
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) composerOpen = false; }}>
    <div class="modal composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" tabindex="-1">
      <button class="modal-close" aria-label="Lukk" onclick={() => composerOpen = false}><X size={22}/></button>
      <PlusSquare size={40}/><h2 id="composer-title">Opprett nytt innlegg</h2>
      {#if !data.user}<p>Du må logge inn før du kan dele.</p><a class="select-button" href="/login">Logg inn</a>
      {:else}<form method="POST" action="?/createPost" enctype="multipart/form-data"><label class="file-field">Velg bilde<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required/></label><label>Bildetekst<textarea name="caption" maxlength="2200" rows="4" placeholder="Skriv noe om øyeblikket …"></textarea></label>{#if form?.postError}<div class="form-error" role="alert">{form.postError}</div>{/if}<button class="select-button">Del nå</button></form>{/if}
    </div>
  </div>
{/if}
