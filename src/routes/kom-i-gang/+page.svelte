<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Copy, HeartHandshake, LockKeyhole, Share2, ShieldCheck, Sparkles, UserRound, Users } from '@lucide/svelte';
  import { compressImage } from '$lib/client/compress-image';
  let { data, form } = $props();
  let step = $state(data.startStep);
  let preparedAvatar: File | null = $state(null);
  let avatarError = $state('');
  let preparing = $state(false);
  let saving = $state(false);
  let copied = $state(false);
  let followStates = $state<Record<string, 'pending' | 'accepted'>>({});
  $effect(() => { if (form?.profileSaved) step = 2; });
  $effect(() => { if (form?.followedId && (form?.followStatus === 'pending' || form?.followStatus === 'accepted')) followStates = { ...followStates, [form.followedId]: form.followStatus }; });

  async function prepareAvatar(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    preparedAvatar = null;
    avatarError = '';
    if (!file) return;
    preparing = true;
    try { preparedAvatar = await compressImage(file, 1000, 900_000); }
    catch (error) { avatarError = error instanceof Error ? error.message : 'Bildet kunne ikke klargjøres.'; }
    finally { preparing = false; }
  }

  const saveProfile: SubmitFunction = ({ formData, cancel }) => {
    if (preparing || avatarError) { cancel(); return; }
    if (preparedAvatar) formData.set('avatar', preparedAvatar); else formData.delete('avatar');
    saving = true;
    return async ({ update }) => { await update(); saving = false; };
  };

  async function shareInvite() {
    const shareData = { title: 'Bli med meg på Samvio', text: `Jeg har blitt med på Samvio. Bli med du også og følg @${data.profile.username}.`, url: data.inviteUrl };
    if (navigator.share) await navigator.share(shareData).catch(() => undefined);
    else await navigator.clipboard.writeText(data.inviteUrl);
    copied = true;
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(data.inviteUrl);
    copied = true;
  }
</script>

<svelte:head><title>Kom i gang – Samvio</title><meta name="robots" content="noindex,nofollow"/></svelte:head>

<main class="onboarding-page">
  <header class="top"><a class="brand" href="/"><span>S</span>Samvio</a><a href="/">Gå til feeden</a></header>
  <div class="onboarding-shell">
    <aside>
      <p>Velkommen, {data.profile.realName.split(' ')[0]}</p>
      <h1>Gjør Samvio til ditt.</h1>
      <nav aria-label="Fremdrift">
        {#each [{ n: 1, label: 'Profilen din' }, { n: 2, label: 'Finn mennesker' }, { n: 3, label: 'Inviter gjengen' }, { n: 4, label: 'Første øyeblikk' }] as item}
          <button class:active={step === item.n} class:done={step > item.n} onclick={() => step = item.n}><span>{step > item.n ? '✓' : item.n}</span>{item.label}</button>
        {/each}
      </nav>
      <div class="promise"><Sparkles size={19}/><p><strong>Ingen anbefalingsalgoritme.</strong><br/>Valgene her fyller bare feeden med mennesker du selv velger.</p></div>
    </aside>

    <section class="step-card">
      <div class="progress"><i style={`width:${step * 25}%`}></i></div>
      {#if step === 1}
        <header><span><UserRound size={23}/></span><div><small>Steg 1 av 4</small><h2>La folk kjenne deg igjen</h2><p>Et bilde og noen ord gjør det enklere for venner å finne riktig person.</p></div></header>
        <form class="profile-form" method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance={saveProfile}>
          <label class="avatar-field"><span>{#if data.profile.avatarPath}<img src={`/profilmedia/avatar/${data.profile.username}?v=${data.profile.updatedAt.getTime()}`} alt="Nåværende profilbilde"/>{:else}<Camera size={27}/>{/if}</span><div><strong>{data.profile.avatarPath ? 'Bytt profilbilde' : 'Legg til profilbilde'}</strong><small>{preparedAvatar ? `Klargjort · ${(preparedAvatar.size / 1024 / 1024).toFixed(1)} MB` : 'JPG, PNG eller WebP'}</small><input name="avatar" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={prepareAvatar}/></div></label>
          <label class="bio-field">Kort om deg<textarea name="bio" maxlength="300" rows="3" placeholder="For eksempel: Gamer, streamer og onkel.">{data.profile.bio ?? ''}</textarea></label>
          <fieldset><legend>Hvem kan følge deg?</legend><label><input type="radio" name="profileVisibility" value="private" checked={data.profile.profileVisibility === 'private'}/><span><LockKeyhole size={19}/><span><strong>Privat profil</strong><small>Du godkjenner alle følgeforespørsler.</small></span></span></label><label><input type="radio" name="profileVisibility" value="public" checked={data.profile.profileVisibility === 'public'}/><span><Users size={19}/><span><strong>Åpen profil</strong><small>Andre kan følge deg med én gang.</small></span></span></label></fieldset>
          {#if avatarError || form?.onboardingError}<p class="error" role="alert">{avatarError || form?.onboardingError}</p>{/if}
          <button class="primary" disabled={preparing || saving || !!avatarError}>{preparing ? 'Klargjør bilde …' : saving ? 'Lagrer …' : 'Lagre og fortsett'} <ArrowRight size={17}/></button>
        </form>
      {:else if step === 2}
        <header><span><Users size={23}/></span><div><small>Steg 2 av 4</small><h2>Velg hvem du vil høre fra</h2><p>Forslagene er ikke en feed-algoritme. Du velger selv, og innlegg vises alltid nyeste først.</p></div></header>
        {#if data.suggestions.length}
          <div class="people-list">{#each data.suggestions as person}{@const followStatus = followStates[person.userId] ?? person.followStatus}<article>{#if person.avatarPath}<img src={`/profilmedia/avatar/${person.username}?v=${person.updatedAt.getTime()}`} alt=""/>{:else}<span><UserRound size={20}/></span>{/if}<div><strong>{person.realName}{#if person.role !== 'user'}<i>{person.role === 'admin' ? 'Admin' : 'Moderator'}</i>{/if}</strong><small>@{person.username}{#if person.username === data.inviter} · inviterte deg{/if}</small>{#if person.bio}<p>{person.bio}</p>{/if}</div><form method="POST" action="?/follow" use:enhance><input type="hidden" name="targetId" value={person.userId}/><button disabled={followStatus !== null}>{followStatus === 'accepted' ? 'Følger' : followStatus === 'pending' ? 'Forespurt' : person.profileVisibility === 'public' ? 'Følg' : 'Be om å følge'}</button></form></article>{/each}</div>
        {:else}<div class="empty"><HeartHandshake size={31}/><h3>Du er blant de første</h3><p>Inviter noen du kjenner i neste steg, så starter dere sammen.</p></div>{/if}
        {#if form?.followError}<p class="error">{form.followError}</p>{/if}
        <div class="step-actions"><button class="quiet" onclick={() => step = 1}><ArrowLeft size={16}/>Tilbake</button><button class="primary" onclick={() => step = 3}>Fortsett <ArrowRight size={17}/></button></div>
      {:else if step === 3}
        <header><span><Share2 size={23}/></span><div><small>Steg 3 av 4</small><h2>Samvio er bedre med noen du kjenner</h2><p>Del din personlige lenke. Den som registrerer seg ser deg først blant forslagene.</p></div></header>
        <div class="invite-card"><span><HeartHandshake size={30}/></span><p>Inviter venner til å følge</p><h3>@{data.profile.username}</h3><div><input readonly value={data.inviteUrl} aria-label="Din invitasjonslenke"/><button onclick={copyInvite} aria-label="Kopier invitasjonslenken"><Copy size={18}/></button></div><button class="share" onclick={shareInvite}><Share2 size={18}/>{copied ? 'Lenken er klar til deling' : 'Del med venner'}</button></div>
        <p class="privacy-note"><ShieldCheck size={17}/>Vi ber ikke om tilgang til kontaktlisten din.</p>
        <div class="step-actions"><button class="quiet" onclick={() => step = 2}><ArrowLeft size={16}/>Tilbake</button><button class="primary" onclick={() => step = 4}>Fortsett <ArrowRight size={17}/></button></div>
      {:else}
        <header><span><CheckCircle2 size={23}/></span><div><small>Steg 4 av 4</small><h2>Du er klar</h2><p>Feeden bygges av dine egne valg og stopper når du har sett alt nytt.</p></div></header>
        <div class="ready"><span><Check size={34}/></span><h3>Velkommen til Samvio</h3><p>Del gjerne det første øyeblikket ditt nå, eller gå inn i feeden og se deg rundt.</p><ul><li><Check size={15}/>Nyeste innlegg vises først</li><li><Check size={15}/>Ingen anbefalte innlegg i feeden</li><li><Check size={15}/>Du kan endre profil og personvern senere</li></ul></div>
        <div class="finish-actions"><form method="POST" action="?/complete"><input type="hidden" name="next" value="post"/><button class="primary">Del mitt første øyeblikk <ArrowRight size={17}/></button></form><form method="POST" action="?/complete"><input type="hidden" name="next" value="home"/><button class="quiet">Gå til feeden</button></form></div>
      {/if}
    </section>
  </div>
</main>

<style>
  :global(body){background:#f6f3ed}.onboarding-page{min-height:100vh;color:#19221d;background:radial-gradient(circle at 9% 90%,#ecd9c8 0,transparent 28rem),radial-gradient(circle at 91% 5%,#dceae1 0,transparent 32rem),#f6f3ed}.top{width:min(1100px,calc(100% - 36px));height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between}.top>a:last-child{color:#315d49;font-size:11px;font-weight:800}.brand{display:flex;align-items:center;gap:8px;font:700 26px 'Newsreader',serif}.brand span{width:29px;height:29px;display:grid;place-items:center;border-radius:10px 5px 10px 5px;background:#315d49;color:#fff;font:800 13px 'DM Sans',sans-serif;transform:rotate(-3deg)}.onboarding-shell{width:min(1040px,calc(100% - 36px));margin:25px auto 70px;display:grid;grid-template-columns:285px minmax(0,1fr);gap:25px}aside{padding:29px;border-radius:20px;background:#203d31;color:#fff;box-shadow:0 20px 50px #26382f1c}aside>p{margin:0;color:#d8a17e;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}aside h1{margin:8px 0 30px;font:600 35px/1 'Newsreader',serif}aside nav{display:grid;gap:7px}aside nav button{display:flex;align-items:center;gap:11px;padding:10px;border:0;border-radius:10px;background:transparent;color:#9eb0a5;text-align:left;font-size:11px;font-weight:700}aside nav button span{width:29px;height:29px;display:grid;place-items:center;border:1px solid #60766a;border-radius:9px;font-size:11px}aside nav button.active{background:#ffffff12;color:#fff}aside nav button.active span{border-color:#fff;background:#fff;color:#315d49}aside nav button.done{color:#bcd1c3}aside nav button.done span{border-color:#6da07f;background:#315d49;color:#fff}.promise{display:flex;gap:10px;margin-top:80px;padding-top:20px;border-top:1px solid #ffffff1c;color:#c4d1c9}.promise svg{flex:none}.promise p{margin:0;font-size:9px;line-height:1.55}.step-card{position:relative;overflow:hidden;min-height:650px;padding:40px;border:1px solid #ddd8ce;border-radius:20px;background:#fff;box-shadow:0 20px 50px #26382f12}.progress{position:absolute;inset:0 0 auto;height:4px;background:#e7e5df}.progress i{display:block;height:100%;background:linear-gradient(90deg,#315d49,#8eb19c);transition:width .25s}.step-card>header{display:flex;gap:14px;margin-bottom:28px}.step-card>header>span{width:47px;height:47px;display:grid;place-items:center;flex:none;border-radius:15px;background:#e6f0ea;color:#315d49}.step-card header small{color:#a45731;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.step-card h2{margin:4px 0 6px;font:600 30px 'Newsreader',serif}.step-card header p{margin:0;color:#707671;font-size:11px;line-height:1.5}.profile-form{display:grid;gap:17px}.avatar-field{display:flex;align-items:center;gap:16px;padding:16px;border:1px dashed #bfcac2;border-radius:14px;background:#f6faf7}.avatar-field>span{width:72px;height:72px;overflow:hidden;display:grid;place-items:center;flex:none;border-radius:50%;background:#315d49;color:#fff}.avatar-field>span img{width:100%;height:100%;object-fit:cover}.avatar-field>div{display:grid;gap:3px}.avatar-field strong{font-size:13px}.avatar-field small{color:#777;font-size:10px}.avatar-field input{margin-top:7px;font-size:10px}.bio-field{display:grid;gap:7px;font-size:12px;font-weight:800}.bio-field textarea{width:100%;resize:none;padding:12px;border:1px solid #d8d6d0;border-radius:10px;font:13px 'DM Sans',sans-serif;line-height:1.5}.profile-form fieldset{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0;padding:0;border:0}.profile-form legend{margin-bottom:8px;font-size:11px;font-weight:800}.profile-form fieldset label{position:relative}.profile-form fieldset input{position:absolute;opacity:0}.profile-form fieldset label>span{height:100%;display:flex;gap:10px;padding:14px;border:1px solid #ddd9d1;border-radius:12px;color:#717772}.profile-form fieldset label>span>span{display:grid;gap:3px}.profile-form fieldset small{color:#7b807c;font-size:9px;line-height:1.4}.profile-form fieldset input:checked+span{border-color:#315d49;background:#edf4f0;color:#315d49;box-shadow:0 0 0 1px #315d49}.primary,.quiet,.people-list button,.share{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:43px;padding:0 16px;border:0;border-radius:9px;background:#315d49;color:#fff;font-size:11px;font-weight:800}.profile-form>.primary{width:max-content;margin-left:auto}.primary:disabled,.people-list button:disabled{opacity:.62}.error{margin:0;padding:10px;border-radius:8px;background:#fff0ed;color:#9b3c2d;font-size:11px}.people-list{display:grid;gap:8px}.people-list article{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:11px;padding:10px;border:1px solid #e4e1da;border-radius:12px}.people-list article>img,.people-list article>span{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;object-fit:cover;background:#e8f0eb;color:#315d49}.people-list article>div{min-width:0;display:grid}.people-list strong{font-size:11px}.people-list strong i{margin-left:6px;color:#a45731;font-size:7px;font-style:normal;text-transform:uppercase}.people-list small{color:#777;font-size:9px}.people-list p{overflow:hidden;margin:3px 0 0;color:#696f6a;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.people-list button{min-height:35px;padding:0 11px}.empty,.ready{min-height:300px;display:grid;place-items:center;align-content:center;text-align:center;color:#315d49}.empty h3,.ready h3{margin:12px 0 5px;font:600 25px 'Newsreader',serif}.empty p,.ready p{max-width:430px;margin:0;color:#737873;font-size:11px;line-height:1.5}.step-actions{display:flex;justify-content:space-between;margin-top:25px}.quiet{border:1px solid #d8d5cf;background:#fff;color:#59615b}.invite-card{padding:30px;border:1px solid #d9ded9;border-radius:18px;background:linear-gradient(145deg,#edf5f0,#faf1e8);text-align:center}.invite-card>span{width:60px;height:60px;display:grid;place-items:center;margin:auto;border-radius:19px;background:#315d49;color:#fff}.invite-card>p{margin:16px 0 2px;color:#777;font-size:10px}.invite-card h3{margin:0 0 20px;font:600 29px 'Newsreader',serif}.invite-card>div{display:flex;width:min(470px,100%);margin:auto}.invite-card input{min-width:0;flex:1;padding:11px;border:1px solid #d3d4cf;border-radius:9px 0 0 9px;background:#fff;color:#626863;font-size:10px}.invite-card>div button{width:43px;border:0;border-radius:0 9px 9px 0;background:#315d49;color:#fff}.invite-card .share{margin-top:12px}.privacy-note{display:flex;align-items:center;justify-content:center;gap:7px;color:#6c756e;font-size:10px}.ready>span{width:76px;height:76px;display:grid;place-items:center;border-radius:24px;background:#e4f0e9}.ready ul{display:grid;gap:8px;margin:22px 0 0;padding:0;list-style:none;color:#4f5b53;text-align:left;font-size:10px}.ready li{display:flex;align-items:center;gap:7px}.finish-actions{display:flex;align-items:center;justify-content:center;gap:9px}.finish-actions form{display:flex}.finish-actions button{width:100%}
  @media(max-width:800px){.onboarding-shell{grid-template-columns:1fr}aside{padding:20px}aside h1{margin-bottom:18px}aside nav{grid-template-columns:repeat(4,1fr)}aside nav button{justify-content:center;padding:8px}aside nav button:not(.active){font-size:0}.promise{display:none}.step-card{min-height:0}}
  @media(max-width:560px){.top{height:60px}.onboarding-shell{width:100%;margin:8px 0 0;gap:0}aside{border-radius:0}aside>p,aside h1{display:none}aside nav button{font-size:0}aside nav button.active{font-size:0}.step-card{padding:30px 16px;border-width:0;border-radius:0}.step-card h2{font-size:27px}.profile-form fieldset{grid-template-columns:1fr}.profile-form>.primary{width:100%}.people-list article{grid-template-columns:40px minmax(0,1fr)}.people-list article>img,.people-list article>span{width:40px;height:40px}.people-list form{grid-column:1/-1}.people-list button{width:100%}.step-actions{position:static;margin:24px 0 0;padding:0;background:transparent;border:0}.finish-actions{align-items:stretch;flex-direction:column}.finish-actions form{width:100%}}
</style>
