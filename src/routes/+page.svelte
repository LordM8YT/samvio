<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { ArrowRight, Clock3, HeartHandshake, LockKeyhole, PlusSquare, ShieldCheck, Sparkles, UserRound, X } from '@lucide/svelte';
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
    {#if data.onboardingComplete === false}<a class="onboarding-reminder" href="/kom-i-gang"><span><Sparkles size={19}/></span><div><strong>Gjør Samvio til ditt</strong><small>Fullfør profilen, finn mennesker og få din personlige invitasjonslenke.</small></div><ArrowRight size={18}/></a>{/if}
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
  .landing-page{min-height:100vh;color:#18231d;background:#faf7f1}.landing-nav{width:min(1180px,calc(100% - 40px));height:82px;margin:auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ded9ce}.landing-brand{display:flex;align-items:center;gap:9px;font:700 28px/1 'Newsreader',serif;letter-spacing:-.7px}.landing-brand span{width:31px;height:31px;display:grid;place-items:center;border-radius:9px 9px 9px 3px;background:#315d49;color:#fff;font:700 16px 'DM Sans',sans-serif;transform:rotate(-3deg)}.landing-nav>div{display:flex;align-items:center;gap:30px;font-size:13px;font-weight:600}.nav-login{padding:10px 17px;border:1px solid #315d49;border-radius:9px;color:#315d49}.landing-hero{width:min(1180px,calc(100% - 40px));margin:auto;padding:76px 0 82px;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(420px,.98fr);align-items:center;gap:86px}.eyebrow{display:flex;align-items:center;gap:9px;margin:0 0 18px;color:#315d49;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.eyebrow i{width:8px;height:8px;border-radius:50%;background:#b76538;box-shadow:0 0 0 5px #f0ded1}.hero-copy h1{max-width:680px;margin:0;color:#142019;font:600 clamp(48px,5.4vw,76px)/.98 'Newsreader',serif;letter-spacing:-3px}.hero-copy h1 em{color:#315d49;font-style:italic;font-weight:500}.hero-lead{max-width:590px;margin:28px 0 0;color:#5f685f;font-size:17px;line-height:1.65}.hero-actions{display:flex;align-items:center;gap:13px;margin-top:32px}.primary-cta,.vipps-cta{min-height:50px;padding:0 21px;display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:11px;background:#315d49;color:#fff;font-weight:800}.vipps-cta{background:#ff5b24}.vipps-cta span{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#ff5b24;font-size:14px}.secondary-cta{padding:15px;color:#315d49;font-size:13px;font-weight:700}.hero-copy>small{display:block;margin-top:17px;color:#8a8e87;font-size:11px}.hero-preview{position:relative;padding:25px;border:1px solid #dcd7cc;border-radius:26px;background:#fff;box-shadow:0 28px 70px #26382f1a;transform:rotate(1deg)}.hero-preview:before{content:'';position:absolute;inset:-19px 35px auto -24px;height:130px;border-radius:30px;background:#dae8e0;z-index:-1;transform:rotate(-4deg)}.preview-top{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 17px}.preview-top span{display:flex;align-items:center;gap:8px;font-weight:800}.preview-top span i{width:7px;height:7px;border-radius:50%;background:#315d49}.preview-top small{color:#777}.preview-moment{overflow:hidden;border:1px solid #e1ddd5;border-radius:17px}.preview-person{display:flex;align-items:center;gap:10px;padding:12px}.preview-person>span{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:#f0ded1;color:#934d29;font-size:11px;font-weight:800}.preview-person div{display:grid}.preview-person strong{font-size:12px}.preview-person small{color:#888;font-size:10px}.preview-photo{position:relative;height:250px;overflow:hidden;background:linear-gradient(#d8ebe7 0 52%,#a9c6b4 52%);isolation:isolate}.sun{position:absolute;width:54px;height:54px;right:50px;top:35px;border-radius:50%;background:#e49a65}.mountain{position:absolute;left:-10%;bottom:-30%;width:75%;height:90%;background:#648a74;clip-path:polygon(0 100%,55% 0,100% 100%)}.mountain.back{left:37%;bottom:-20%;width:72%;height:82%;background:#789c86}.mountain.front{left:-9%;bottom:-44%;width:120%;height:85%;background:#315d49}.preview-photo p{position:absolute;left:16px;bottom:14px;z-index:2;margin:0;padding:8px 11px;border-radius:8px;background:#fffc;color:#24352b;font-size:11px;font-weight:600;backdrop-filter:blur(6px)}.preview-end{display:flex;align-items:center;gap:10px;padding:18px 5px 1px;color:#315d49}.preview-end div{display:grid}.preview-end strong{font-size:11px}.preview-end small{color:#899089;font-size:9px}.landing-values{width:min(1180px,calc(100% - 40px));margin:auto;padding:30px 0;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #ded9ce;border-bottom:1px solid #ded9ce}.landing-values article{display:flex;gap:14px;padding:13px 30px;color:#315d49}.landing-values article+article{border-left:1px solid #ded9ce}.landing-values h2{margin:0 0 5px;color:#202822;font-size:14px}.landing-values p{margin:0;color:#737a73;font-size:12px;line-height:1.5}.public-preview{width:min(1180px,calc(100% - 40px));margin:auto;padding:84px 0 96px}.public-preview>header{display:flex;align-items:end;justify-content:space-between;margin-bottom:27px}.public-preview h2{margin:0;font:600 40px 'Newsreader',serif}.public-preview header a{display:flex;align-items:center;gap:7px;color:#315d49;font-size:13px;font-weight:800}.public-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.public-card{overflow:hidden;border:1px solid #dfdbd2;border-radius:17px;background:#fff;transition:transform .18s,box-shadow .18s}.public-card:hover{transform:translateY(-3px);box-shadow:0 15px 35px #26382f14}.public-card img{width:100%;aspect-ratio:4/3;display:block;object-fit:cover}.public-card>div{padding:15px}.public-card strong,.public-card span{font-size:12px}.public-card span{margin-left:6px;color:#888}.public-card p{display:-webkit-box;overflow:hidden;margin:8px 0 0;color:#586159;font-size:12px;line-height:1.45;line-clamp:2;-webkit-line-clamp:2;-webkit-box-orient:vertical}.public-empty{min-height:270px;padding:40px;display:grid;place-items:center;align-content:center;border:1px dashed #cbd3cc;border-radius:20px;background:#f4f7f3;text-align:center}.public-empty>div{width:58px;height:58px;display:grid;place-items:center;border-radius:18px;background:#e0ece5;color:#315d49}.public-empty h3{margin:17px 0 5px;font:600 24px 'Newsreader',serif}.public-empty p{max-width:470px;margin:0;color:#747b75;font-size:13px}.landing-footer{width:min(1180px,calc(100% - 40px));margin:auto;padding:28px 0 36px;display:flex;align-items:center;gap:23px;border-top:1px solid #ded9ce;color:#7b817c}.landing-footer .landing-brand{font-size:20px;color:#24352b}.landing-footer .landing-brand span{width:25px;height:25px;font-size:12px}.landing-footer p{font-size:11px}.landing-footer nav{display:flex;gap:18px;margin-left:auto;font-size:11px}
  .vipps-disabled{cursor:not-allowed;filter:saturate(.45);opacity:.72}
  .quick-share{display:flex;align-items:center;gap:11px;margin:8px 0 14px;padding:12px;border:1px solid #ddd7cc;border-radius:14px;background:linear-gradient(120deg,#fff,#f7f1e7);box-shadow:0 8px 25px #26382f0a}.quick-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;background:#e7f0eb;color:#315d49}.quick-share button{flex:1;padding:11px 14px;border:1px solid #e0ddd5;border-radius:999px;background:#fff;color:#747874;text-align:left}.quick-share>svg{color:#b76538}@media(max-width:700px){.quick-share{margin:0;padding:10px 14px;border-width:0 0 1px;border-radius:0;box-shadow:none}.quick-share>svg{display:none}}
  .commercial-toggle{display:flex!important;grid-template-columns:none!important;align-items:flex-start;gap:10px!important;padding:12px;border:1px solid #dfd8cb;border-radius:9px;background:#faf6ef}.commercial-toggle input{width:18px;height:18px;margin:1px 0}.commercial-toggle span{display:grid;gap:2px}.commercial-toggle small{color:#777;font-weight:400;line-height:1.4}.composer label>input:not([type=file]):not([type=checkbox]){padding:10px;border:1px solid #d6d6d6;border-radius:7px;font:13px 'DM Sans',sans-serif}
  @media(max-width:850px){.landing-hero{grid-template-columns:1fr;padding-top:55px;gap:65px}.hero-preview{width:min(560px,100%);margin:auto}.landing-values{grid-template-columns:1fr}.landing-values article{padding:19px 5px}.landing-values article+article{border-left:0;border-top:1px solid #ded9ce}.public-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.landing-nav{height:68px}.landing-nav>div>a:not(.nav-login){display:none}.landing-nav>div{gap:0}.landing-hero{width:min(100% - 28px,1180px);padding:45px 0 58px}.hero-copy h1{font-size:46px;letter-spacing:-2px}.hero-lead{font-size:15px}.hero-actions{align-items:stretch;flex-direction:column}.secondary-cta{text-align:center}.hero-preview{padding:14px;border-radius:19px}.preview-photo{height:210px}.landing-values,.public-preview,.landing-footer{width:min(100% - 28px,1180px)}.public-preview{padding:60px 0}.public-preview h2{font-size:32px}.public-grid{grid-template-columns:1fr}.public-preview>header{align-items:start}.landing-footer{align-items:flex-start;flex-wrap:wrap}.landing-footer p{width:calc(100% - 80px);margin:7px 0}.landing-footer nav{width:100%;margin:0}.landing-page{padding-bottom:env(safe-area-inset-bottom)}}
  .onboarding-reminder{display:flex;align-items:center;gap:11px;margin:8px 0 14px;padding:13px;border:1px solid #d7c9b9;border-radius:14px;background:linear-gradient(120deg,#f3dfcc,#e8f2ec);color:#315d49;box-shadow:0 8px 25px #26382f0b}.onboarding-reminder>span{width:40px;height:40px;display:grid;place-items:center;flex:none;border-radius:12px;background:#315d49;color:#fff}.onboarding-reminder>div{min-width:0;display:grid;gap:3px;flex:1}.onboarding-reminder strong{font-size:12px}.onboarding-reminder small{color:#667169;font-size:10px;line-height:1.4}@media(max-width:700px){.onboarding-reminder{margin:0;padding:11px 14px;border-width:0 0 1px;border-radius:0;box-shadow:none}}
</style>
