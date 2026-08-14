<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { PlusSquare, ShieldCheck, UserRound, X } from '@lucide/svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  import { compressImage } from '$lib/client/compress-image';
  let { data, form } = $props();
  let composerOpen = $state(false);
  let feedMarked = $state(false);
  let uploadError = $state('');
  let selectedFileName = $state('');
  let isPublishing = $state(false);
  let isCompressing = $state(false);
  let compressedImage: File | null = null;
  $effect(() => { if (form?.postError || data.openComposer) composerOpen = true; });
  async function validateImage(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    selectedFileName = file?.name ?? '';
    uploadError = '';
    compressedImage = null;
    if (!file) return;
    isCompressing = true;
    try {
      compressedImage = await compressImage(file);
      selectedFileName = `${file.name} · klargjort ${Math.max(0.1, compressedImage.size / 1024 / 1024).toFixed(1)} MB`;
    } catch (error) {
      uploadError = error instanceof Error ? error.message : 'Bildet kunne ikke klargjøres.';
    } finally {
      isCompressing = false;
    }
  }
  const submitPost: SubmitFunction = ({ formData, cancel }) => {
    if (isCompressing || uploadError || !compressedImage) { cancel(); return; }
    formData.set('image', compressedImage);
    isPublishing = true;
    return async ({ update }) => { await update(); isPublishing = false; };
  };
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
    {#if data.user}<section class="quick-share"><div class="quick-avatar"><UserRound size={20}/></div><button onclick={() => composerOpen = true}>Del et bilde eller øyeblikk …</button><PlusSquare size={20}/></section>{/if}
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

  <aside class="right-rail"><div class="account-row"><div class="profile-avatar"><UserRound size={22}/></div><div><strong>{data.user?.realName ?? 'Din profil'}</strong><span>{data.user ? `@${data.user.username}` : 'Ikke logget inn'}</span></div>{#if !data.user}<a href="/login">Logg inn</a>{/if}</div><div class="safe-note"><ShieldCheck size={20}/><p><strong>Trygg alpha.</strong><br/>Inviterte testbrukere og tydelige grenser.</p></div></aside>
</div>

{#if composerOpen}
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) composerOpen = false; }}>
    <div class="modal composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" tabindex="-1">
      <button class="modal-close" aria-label="Lukk" onclick={() => composerOpen = false}><X size={22}/></button>
      <PlusSquare size={40}/><h2 id="composer-title">Opprett nytt innlegg</h2>
      {#if !data.user}<p>Du må logge inn før du kan dele.</p><a class="select-button" href="/login">Logg inn</a>
      {:else}<form method="POST" action="?/createPost" enctype="multipart/form-data" use:enhance={submitPost}><label class="file-field">Velg bilde<input name="image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={validateImage} required/>{#if selectedFileName}<span>{selectedFileName}</span>{/if}</label><label>Bildetekst<textarea name="caption" maxlength="2200" rows="4" placeholder="Skriv noe om øyeblikket …"></textarea></label>{#if uploadError}<div class="form-error" role="alert">{uploadError}</div>{/if}{#if form?.postError}<div class="form-error" role="alert">{form.postError}</div>{/if}<button class="select-button" disabled={isPublishing || isCompressing || !!uploadError}>{isCompressing ? 'Klargjør bilde …' : isPublishing ? 'Laster opp …' : 'Del nå'}</button></form>{/if}
    </div>
  </div>
{/if}

<style>
  .quick-share{display:flex;align-items:center;gap:11px;margin:8px 0 14px;padding:12px;border:1px solid #ddd7cc;border-radius:14px;background:linear-gradient(120deg,#fff,#f7f1e7);box-shadow:0 8px 25px #26382f0a}.quick-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;background:#e7f0eb;color:#315d49}.quick-share button{flex:1;padding:11px 14px;border:1px solid #e0ddd5;border-radius:999px;background:#fff;color:#747874;text-align:left}.quick-share>svg{color:#b76538}@media(max-width:700px){.quick-share{margin:0;padding:10px 14px;border-width:0 0 1px;border-radius:0;box-shadow:none}.quick-share>svg{display:none}}
</style>
