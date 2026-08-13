<script lang="ts">
  import { Bell, Compass, Heart, Home, Menu, MessageCircle, PlusSquare, Search, ShieldCheck, UserRound, Video, X } from '@lucide/svelte';
  let { data, form } = $props();
  let composerOpen = $state(false);
  $effect(() => { if (form?.postError) composerOpen = true; });
  const navigation = [
    { label: 'Hjem', icon: Home, active: true }, { label: 'Søk', icon: Search },
    { label: 'Utforsk', icon: Compass }, { label: 'Videoer', icon: Video },
    { label: 'Meldinger', icon: MessageCircle }, { label: 'Varsler', icon: Bell },
    { label: 'Opprett', icon: PlusSquare, action: true }, { label: 'Profil', icon: UserRound }
  ];
</script>

<svelte:head><title>Samvio – ekte øyeblikk</title><meta name="description" content="En trygg, kronologisk og algoritmefri sosial møteplass." /></svelte:head>

<div class="instagram-layout">
  <aside class="main-nav">
    <a class="wordmark" href="/" aria-label="Samvio hjem"><span class="camera-mark"></span><span>Samvio</span></a>
    <nav aria-label="Hovedmeny">{#each navigation as item}<button class:active={item.active} onclick={() => item.action && (composerOpen = true)}><item.icon size={25} strokeWidth={item.active ? 2.5 : 1.8}/><span>{item.label}</span></button>{/each}</nav>
    <button class="more"><Menu size={25}/><span>Mer</span></button>
  </aside>

  <main class="feed-column">
    <header class="mobile-header"><a class="wordmark" href="/">Samvio</a><div><Bell size={23}/><MessageCircle size={23}/></div></header>
    <section class="stories" aria-label="Historier"><button class="own-story"><span class="story-ring"><span class="avatar-placeholder"><UserRound size={23}/></span><i>+</i></span><strong>Din historie</strong></button><div class="stories-message">Historier fra venner vises her</div></section>
    <section class="feed-label"><div><h1>Min feed</h1><span><i></i>Kronologisk</span></div><p>Nyeste innlegg vises først. Alltid.</p></section>

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
      <section class="empty-state"><div class="empty-icon"><PlusSquare size={32}/></div><h2>Del ditt første øyeblikk</h2><p>Når du og menneskene du følger deler bilder eller videoer, vises de her — uten anbefalinger og uten endeløs scrolling.</p><button class="text-action" onclick={() => composerOpen = true}>Del bilde eller video</button></section>
    {/if}
    <div class="feed-end"><ShieldCheck size={17}/><span>Du er helt ajour</span></div>
    <nav class="mobile-nav" aria-label="Mobilmeny"><Home size={24}/><Search size={24}/><button onclick={() => composerOpen = true} aria-label="Opprett"><PlusSquare size={24}/></button><Video size={24}/><UserRound size={24}/></nav>
  </main>

  <aside class="right-rail"><div class="account-row"><div class="profile-avatar"><UserRound size={22}/></div><div><strong>{data.user?.realName ?? 'Din profil'}</strong><span>{data.user ? `@${data.user.username}` : 'Ikke logget inn'}</span></div>{#if !data.user}<a href="/login">Logg inn</a>{/if}</div><div class="safe-note"><ShieldCheck size={20}/><p><strong>Ekte mennesker.</strong><br/>Verifiserte kontoer og trygghet som standard.</p></div><div class="rail-links"><a href="/priser">Priser</a><a href="/">Om</a><a href="/">Hjelp</a><a href="/">Personvern</a><a href="/">Vilkår</a></div><small>© 2026 SAMVIO</small></aside>
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
