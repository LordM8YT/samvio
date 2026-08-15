<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { ArrowRight, Clock3, HeartHandshake, LockKeyhole, PlusSquare, ShieldCheck, UserRound, X } from '@lucide/svelte';
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
  let isCommercial = $state(false);
  let isPublic = $state(false);
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

<svelte:head><title>Samvio – den norske, støyfrie sosiale plattformen</title><meta name="description" content="Del ekte øyeblikk med mennesker du velger. Kronologisk, norsk og uten en anbefalingsalgoritme som holder deg fast." /></svelte:head>

{#if !data.user}
  <main class="landing-page">
    <nav class="landing-nav" aria-label="Hovedmeny">
      <a class="landing-brand" href="/" aria-label="Samvio forside"><span>S</span>Samvio</a>
      <div><a href="/om">Om Samvio</a><a href="/personvern">Personvern</a><a class="nav-login" href="/login">Logg inn</a></div>
    </nav>

    <section class="landing-hero">
      <div class="hero-copy">
        <p class="eyebrow"><i></i>Norsk · kronologisk · uten anbefalinger</p>
        <h1>Den norske, støyfrie<br/><em>sosiale plattformen.</em></h1>
        <p class="hero-lead">Del ekte øyeblikk med menneskene du velger. Samvio har en feed som tar slutt, tydelige grenser og ingen skjult algoritme som bestemmer hva du skal se.</p>
        <div class="hero-actions">
          {#if data.vippsLoginEnabled}
            <a class="vipps-cta" href="/auth/vipps?next=/"><span>V</span>Fortsett med Vipps</a>
          {:else}
            <span class="vipps-cta vipps-disabled" aria-disabled="true"><span>V</span>Vipps Logg inn · kommer snart</span>
          {/if}
          <a class="secondary-cta" href={data.vippsLoginEnabled ? '/login' : '/login?ny=1'}>{data.vippsLoginEnabled ? 'Bruk e-post i stedet' : 'Opprett med e-post'}</a>
        </div>
        <small>Alpha · gratis å prøve · du eier oppmerksomheten din</small>
      </div>

      <div class="hero-preview" aria-label="Slik fungerer Samvio">
        <div class="preview-top"><span><i></i>Siden sist</span><small>Kronologisk</small></div>
        <article class="preview-moment">
          <div class="preview-person"><span>SA</span><div><strong>Silje Andersen</strong><small>@silje · akkurat nå</small></div></div>
          <div class="preview-photo"><div class="sun"></div><div class="mountain back"></div><div class="mountain front"></div><p>Et lite øyeblikk fra turen hjem 🌿</p></div>
        </article>
        <div class="preview-end"><ShieldCheck size={19}/><div><strong>Du er ajour</strong><small>Feeden slutter når du har sett alt.</small></div></div>
      </div>
    </section>

    <section class="landing-values" aria-label="Hvorfor Samvio">
      <article><Clock3 size={23}/><div><h2>Nyeste først. Alltid.</h2><p>Innlegg vises etter tidspunkt, ikke etter hva som gir mest skjermtid.</p></div></article>
      <article><HeartHandshake size={23}/><div><h2>Mennesker, ikke tall.</h2><p>Følg venner og fellesskap du selv har valgt. Ingen anbefalt støy.</p></div></article>
      <article><LockKeyhole size={23}/><div><h2>Bygget med grenser.</h2><p>Tydelig identitet, moderering og aldersvern ligger i grunnmuren.</p></div></article>
    </section>

    <section class="public-preview">
      <header><div><p class="eyebrow"><i></i>Fra fellesskapet</p><h2>Offentlige øyeblikk</h2></div><a href="/login?ny=1">Bli med <ArrowRight size={16}/></a></header>
      {#if data.posts.length}
        <div class="public-grid">
          {#each data.posts as post}
            <a class="public-card" href={`/innlegg/${post.id}`}>
              {#if post.mediaId}<img src={`/media/${post.mediaId}`} alt={post.caption || `Bilde delt av ${post.authorName}`}/>{/if}
              <div><strong>{post.authorName}</strong><span>@{post.authorUsername}</span>{#if post.caption}<p>{post.caption}</p>{/if}</div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="public-empty"><div><PlusSquare size={28}/></div><h3>De første offentlige øyeblikkene er på vei</h3><p>Samvio åpner smått og forsiktig. Opprett en konto og vær med fra starten.</p></div>
      {/if}
    </section>

    <footer class="landing-footer"><a class="landing-brand" href="/"><span>S</span>Samvio</a><p>Et roligere norsk sted å dele.</p><nav><a href="/vilkar">Vilkår</a><a href="/personvern">Personvern</a><a href="/hjelp">Hjelp</a></nav></footer>
  </main>
{:else}
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

  <aside class="right-rail"><div class="account-row"><div class="profile-avatar"><UserRound size={22}/></div><div><strong>{data.user.realName}</strong><span>@{data.user.username}</span></div></div><div class="safe-note"><ShieldCheck size={20}/><p><strong>Trygg alpha.</strong><br/>Inviterte testbrukere og tydelige grenser.</p></div></aside>
</div>

{#if composerOpen}
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) composerOpen = false; }}>
    <div class="modal composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" tabindex="-1">
      <button class="modal-close" aria-label="Lukk" onclick={() => composerOpen = false}><X size={22}/></button>
      <PlusSquare size={40}/><h2 id="composer-title">Opprett nytt innlegg</h2>
      <form method="POST" action="?/createPost" enctype="multipart/form-data" use:enhance={submitPost}><label class="file-field">Velg bilde<input name="image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={validateImage} required/>{#if selectedFileName}<span>{selectedFileName}</span>{/if}</label><label>Bildetekst<textarea name="caption" maxlength="2200" rows="4" placeholder="Skriv noe om øyeblikket …"></textarea></label><label class="commercial-toggle"><input name="isPublic" type="checkbox" bind:checked={isPublic}/><span><strong>Vis offentlig</strong><small>Innlegget kan vises på forsiden og deles med personer som ikke er logget inn.</small></span></label><label class="commercial-toggle"><input name="isCommercial" type="checkbox" bind:checked={isCommercial}/><span><strong>Reklame eller sponset innhold</strong><small>Merk kommersielt innhold tydelig. Det får aldri ekstra rekkevidde.</small></span></label>{#if isCommercial}<label>Annonsør eller sponsor<input name="sponsorName" maxlength="120" placeholder="Navnet på virksomheten" required/></label>{/if}{#if uploadError}<div class="form-error" role="alert">{uploadError}</div>{/if}{#if form?.postError}<div class="form-error" role="alert">{form.postError}</div>{/if}<button class="select-button" disabled={isPublishing || isCompressing || !!uploadError}>{isCompressing ? 'Klargjør bilde …' : isPublishing ? 'Laster opp …' : 'Del nå'}</button></form>
    </div>
  </div>
{/if}
{/if}

<style>
  .vipps-disabled{cursor:not-allowed;filter:saturate(.45);opacity:.72}
  .quick-share{display:flex;align-items:center;gap:11px;margin:8px 0 14px;padding:12px;border:1px solid #ddd7cc;border-radius:14px;background:linear-gradient(120deg,#fff,#f7f1e7);box-shadow:0 8px 25px #26382f0a}.quick-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;background:#e7f0eb;color:#315d49}.quick-share button{flex:1;padding:11px 14px;border:1px solid #e0ddd5;border-radius:999px;background:#fff;color:#747874;text-align:left}.quick-share>svg{color:#b76538}@media(max-width:700px){.quick-share{margin:0;padding:10px 14px;border-width:0 0 1px;border-radius:0;box-shadow:none}.quick-share>svg{display:none}}
  .commercial-toggle{display:flex!important;grid-template-columns:none!important;align-items:flex-start;gap:10px!important;padding:12px;border:1px solid #dfd8cb;border-radius:9px;background:#faf6ef}.commercial-toggle input{width:18px;height:18px;margin:1px 0}.commercial-toggle span{display:grid;gap:2px}.commercial-toggle small{color:#777;font-weight:400;line-height:1.4}.composer label>input:not([type=file]):not([type=checkbox]){padding:10px;border:1px solid #d6d6d6;border-radius:7px;font:13px 'DM Sans',sans-serif}
  @media(max-width:850px){.landing-hero{grid-template-columns:1fr;padding-top:55px;gap:65px}.hero-preview{width:min(560px,100%);margin:auto}.landing-values{grid-template-columns:1fr}.landing-values article{padding:19px 5px}.landing-values article+article{border-left:0;border-top:1px solid #ded9ce}.public-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.landing-nav{height:68px}.landing-nav>div>a:not(.nav-login){display:none}.landing-nav>div{gap:0}.landing-hero{width:min(100% - 28px,1180px);padding:45px 0 58px}.hero-copy h1{font-size:46px;letter-spacing:-2px}.hero-lead{font-size:15px}.hero-actions{align-items:stretch;flex-direction:column}.secondary-cta{text-align:center}.hero-preview{padding:14px;border-radius:19px}.preview-photo{height:210px}.landing-values,.public-preview,.landing-footer{width:min(100% - 28px,1180px)}.public-preview{padding:60px 0}.public-preview h2{font-size:32px}.public-grid{grid-template-columns:1fr}.public-preview>header{align-items:start}.landing-footer{align-items:flex-start;flex-wrap:wrap}.landing-footer p{width:calc(100% - 80px);margin:7px 0}.landing-footer nav{width:100%;margin:0}.landing-page{padding-bottom:env(safe-area-inset-bottom)}}
</style>
