<script lang="ts">
  import { PlusSquare, ShieldCheck, UserRound, X } from '@lucide/svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  let { data, form } = $props();
  let composerOpen = $state(false);
  let feedMarked = $state(false);
  let uploadError = $state('');
  let selectedFileName = $state('');
  let isPublishing = $state(false);
  $effect(() => { if (form?.postError || data.openComposer) composerOpen = true; });
  function validateImage(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    selectedFileName = file?.name ?? '';
    uploadError = !file ? '' : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? 'Velg et bilde i JPG-, PNG- eller WebP-format.'
      : file.size > 10 * 1024 * 1024 ? 'Bildet kan være maks 10 MB.' : '';
  }
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
</script>

<svelte:head><title>Samvio – ekte øyeblikk</title><meta name="description" content="En trygg, kronologisk og algoritmefri sosial møteplass." /></svelte:head>

<div class="samvio-shell">
  <main class="feed-column">
    <section class="feed-label"><div><h1>Siden sist</h1><span><i></i>Kronologisk · Ingen anbefalinger</span></div><p>{data.posts.length} nye øyeblikk fra {data.peopleCount} {data.peopleCount === 1 ? 'person' : 'personer'}.</p></section>

    {#if data.posts.length}
      <section class="post-list" aria-label="Innlegg">
        {#each data.posts as post}<PostCard {post}/>{/each}
      </section>
    {:else}
      <section class="empty-state"><div class="empty-icon"><ShieldCheck size={32}/></div><h2>Ingen nye øyeblikk</h2><p>Du har sett alt nytt fra menneskene du følger. Feeden fylles først når noen du har valgt å følge deler noe.</p><div class="empty-actions"><button class="select-button" onclick={() => composerOpen = true}>Del et øyeblikk</button><a href="/sok">Finn mennesker</a></div></section>
    {/if}
    <div class="feed-end" use:observeFeedEnd><ShieldCheck size={17}/><div><strong>Du er ajour</strong><span>Du har sett alt nytt fra menneskene du følger.</span></div><a href="/historikk">Se tidligere innlegg</a></div>
  </main>

  <aside class="right-rail"><div class="account-row"><div class="profile-avatar"><UserRound size={22}/></div><div><strong>{data.user?.realName ?? 'Din profil'}</strong><span>{data.user ? `@${data.user.username}` : 'Ikke logget inn'}</span></div>{#if !data.user}<a href="/login">Logg inn</a>{/if}</div><div class="safe-note"><ShieldCheck size={20}/><p><strong>Trygg alpha.</strong><br/>Inviterte testbrukere og tydelige grenser.</p></div><div class="rail-links"><a href="/priser">Priser</a><a href="/om">Om</a><a href="/hjelp">Hjelp</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a></div><small>© 2026 SAMVIO</small></aside>
</div>

{#if composerOpen}
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) composerOpen = false; }}>
    <div class="modal composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" tabindex="-1">
      <button class="modal-close" aria-label="Lukk" onclick={() => composerOpen = false}><X size={22}/></button>
      <PlusSquare size={40}/><h2 id="composer-title">Opprett nytt innlegg</h2>
      {#if !data.user}<p>Du må logge inn før du kan dele.</p><a class="select-button" href="/login">Logg inn</a>
      {:else}<form method="POST" action="?/createPost" enctype="multipart/form-data" onsubmit={(event) => { if (uploadError) event.preventDefault(); else isPublishing = true; }}><label class="file-field">Velg bilde<input name="image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={validateImage} required/>{#if selectedFileName}<span>{selectedFileName}</span>{/if}</label><label>Bildetekst<textarea name="caption" maxlength="2200" rows="4" placeholder="Skriv noe om øyeblikket …"></textarea></label>{#if uploadError}<div class="form-error" role="alert">{uploadError}</div>{/if}{#if form?.postError}<div class="form-error" role="alert">{form.postError}</div>{/if}<button class="select-button" disabled={isPublishing || !!uploadError}>{isPublishing ? 'Publiserer …' : 'Del nå'}</button></form>{/if}
    </div>
  </div>
{/if}
