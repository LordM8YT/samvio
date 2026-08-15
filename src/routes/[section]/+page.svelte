<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { Search, ShieldCheck, UserRound } from '@lucide/svelte';
  import { compressImage } from '$lib/client/compress-image';
  let { data, form } = $props();
  let preparedAvatar: File | null = $state(null);
  let preparedCover: File | null = $state(null);
  let preparingImages = $state(0);
  let profileUploadError = $state('');
  let savingProfile = $state(false);
  async function prepareProfileImage(event: Event, kind: 'avatar' | 'cover') {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (kind === 'avatar') preparedAvatar = null; else preparedCover = null;
    if (!file) return;
    preparingImages += 1;
    profileUploadError = '';
    try {
      const prepared = await compressImage(file, kind === 'avatar' ? 1200 : 2200, kind === 'avatar' ? 1_200_000 : 2_500_000);
      if (kind === 'avatar') preparedAvatar = prepared; else preparedCover = prepared;
    } catch (error) {
      profileUploadError = error instanceof Error ? error.message : 'Bildet kunne ikke klargjøres.';
    } finally {
      preparingImages -= 1;
    }
  }
  const submitProfile: SubmitFunction = ({ formData, cancel }) => {
    if (preparingImages || profileUploadError) { cancel(); return; }
    if (preparedAvatar) formData.set('avatar', preparedAvatar); else formData.delete('avatar');
    if (preparedCover) formData.set('cover', preparedCover); else formData.delete('cover');
    savingProfile = true;
    return async ({ update }) => { await update(); savingProfile = false; };
  };
  const copy: Record<string, { title: string; intro: string; emptyTitle: string; emptyText: string }> = {
    utforsk: { title: 'Utforsk', intro: 'Finn fellesskap du selv velger å følge.', emptyTitle: 'Fellesskap kommer her', emptyText: 'Vi bygger temabaserte rom uten anbefalingsalgoritmer.' },
    videoer: { title: 'Videoer', intro: 'Videoer fra menneskene og fellesskapene du følger.', emptyTitle: 'Ingen videoer ennå', emptyText: 'Dette er vanlige videoinnlegg — ikke direktesending.' },
    meldinger: { title: 'Meldinger', intro: 'Private samtaler med tydelige trygghetsgrenser.', emptyTitle: 'Ingen samtaler ennå', emptyText: 'Meldinger åpnes først når sikkerhetsreglene og relasjonskontrollen er på plass.' },
    varsler: { title: 'Varsler', intro: 'Nye hendelser vises i kronologisk rekkefølge.', emptyTitle: 'Du har ingen nye varsler', emptyText: 'Her kommer forespørsler, kommentarer og andre hendelser.' }
  };
  const infoCopy: Record<string, { title: string; intro: string; paragraphs: string[] }> = {
    om: { title: 'Om Samvio', intro: 'Venner først. Kronologisk. En feed med en slutt.', paragraphs: ['Samvio er en norsk alpha for rolig deling av bilder mellom mennesker som aktivt har valgt hverandre.', 'Vi bygger ikke for maksimal skjermtid. Ingen anbefalingsalgoritme bestemmer rekkefølgen, og feeden stopper når du er ajour.'] },
    personvern: { title: 'Personvern', intro: 'Alpha – sist oppdatert 14. august 2026', paragraphs: ['Samvio lagrer kontoinformasjon, innlegg, følgerelasjoner og opplastede bilder for å levere tjenesten. Vi selger ikke personopplysninger eller bruker aktivitet til målrettet reklame.', 'Alpha-kontoer bruker e-post og passord og er ikke BankID-verifiserte. Denne teksten er et foreløpig sammendrag og må gjennomgås juridisk før offentlig lansering.', 'Du kan be om innsyn, retting eller sletting via hjelpesiden.'] },
    vilkar: { title: 'Vilkår for alpha', intro: 'Alpha – sist oppdatert 14. august 2026', paragraphs: ['Samvio er under aktiv utvikling. Funksjoner kan endres, og perioder med nedetid kan forekomme.', 'Du må være minst 13 år for å delta i alphaen. Ikke publiser ulovlig, truende eller privat materiale om andre uten samtykke.', 'Disse vilkårene er ikke endelig juridisk tekst og skal gjennomgås av menneske før offentlig lansering.'] },
    hjelp: { title: 'Hjelp', intro: 'Vi hjelper alpha-testere direkte.', paragraphs: ['Ved problemer kan du kontakte eieren av alphaen. Ikke send passord, fødselsnummer eller BankID-opplysninger i en melding.', 'Samvio support vil aldri be deg verifisere kontoen via en tilfeldig lenke eller be om passordet ditt. Konto- og sletteforespørsler blir håndtert manuelt i alphaen.'] }
  };
  const pageTitle = $derived(data.section === 'innstillinger' ? 'Innstillinger' : data.section === 'sok' ? 'Søk' : infoCopy[data.section]?.title ?? copy[data.section]?.title ?? 'Samvio');
</script>

<svelte:head><title>{pageTitle} – Samvio</title></svelte:head>

<main class="section-layout">
  <div class="section-shell">
    {#if infoCopy[data.section]}
      {@const info = infoCopy[data.section]}
      <h1>{info.title}</h1><p class="section-intro">{info.intro}</p>
      <section class="section-card info-copy">{#each info.paragraphs as paragraph}<p>{paragraph}</p>{/each}</section>
    {:else if data.section === 'sok'}
      <h1>Søk</h1><p class="section-intro">Finn ekte, verifiserte mennesker på Samvio.</p>
      <form class="search-form" method="GET"><input name="q" value={data.query} placeholder="Søk etter navn eller brukernavn" aria-label="Søk"/><button>Søk</button></form>
      {#if data.query && data.results.length}
        <div class="search-results">{#each data.results as person}<div class="person-row"><a href={`/bruker/${person.username}`} aria-label={`Se profilen til ${person.realName}`}><UserRound size={21}/></a><div><a href={`/bruker/${person.username}`}><strong>{person.realName}</strong><small>@{person.username}</small></a></div>{#if person.followStatus !== 'blocked'}<form method="POST" action={person.followStatus === 'accepted' ? '?/unfollow' : '?/follow'}><input type="hidden" name="targetId" value={person.userId}/><button disabled={person.followStatus === 'pending'}>{person.followStatus === 'accepted' ? 'Slutt å følge' : person.followStatus === 'pending' ? 'Forespurt' : 'Følg'}</button></form>{/if}</div>{/each}</div>
      {:else if data.query}
        <div class="section-card section-empty"><Search size={34}/><h2>Ingen treff</h2><p>Vi fant ingen profiler som matcher «{data.query}».</p></div>
      {/if}
    {:else if data.section === 'varsler'}
      <h1>Varsler</h1><p class="section-intro">Følgeforespørsler og nye hendelser, nyeste først.</p>
      {#if data.followRequests.length}<section class="section-card request-list"><h2>Følgeforespørsler</h2>{#each data.followRequests as request}<article><a href={`/bruker/${request.username}`}><UserRound size={20}/><span><strong>{request.realName}</strong><small>@{request.username}</small></span></a><form method="POST" action="?/respondFollow"><input type="hidden" name="requesterId" value={request.userId}/><button name="decision" value="accept">Godta</button><button class="quiet" name="decision" value="reject">Avslå</button></form></article>{/each}</section>{:else}<section class="section-card section-empty"><ShieldCheck size={34}/><h2>Ingen nye varsler</h2><p>Du har ingen følgeforespørsler som venter.</p></section>{/if}
    {:else if data.section === 'innstillinger'}
      {@const user = data.user}
      <h1>Innstillinger</h1><p class="section-intro">Administrer profil, konto og medlemskap.</p>
      {#if user}
        <nav class="settings-nav" aria-label="Innstillingskategorier"><a href="#profil">Profil</a><a href="#konto">Konto</a><a href="#personvern">Personvern</a></nav>
        <section id="profil" class="section-card account-settings"><h2>Profil</h2><p class="settings-help">Dette vises på profilsiden din.</p><form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance={submitProfile}><div class="image-fields"><label>Profilbilde<span>{preparedAvatar ? `Klargjort · ${(preparedAvatar.size / 1024 / 1024).toFixed(1)} MB` : data.profileImages.avatar ? 'Bytt bilde' : 'Velg bilde'}</span><input name="avatar" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={(event) => prepareProfileImage(event, 'avatar')}/></label><label>Forsidebilde<span>{preparedCover ? `Klargjort · ${(preparedCover.size / 1024 / 1024).toFixed(1)} MB` : data.profileImages.cover ? 'Bytt bilde' : 'Velg bilde'}</span><input name="cover" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={(event) => prepareProfileImage(event, 'cover')}/></label></div><label class="bio-label">Om deg<textarea name="bio" maxlength="300" rows="4" placeholder="Fortell kort hvem du er …">{data.profileBio ?? ''}</textarea></label>{#if profileUploadError}<p class="form-error" role="alert">{profileUploadError}</p>{/if}<button disabled={!!preparingImages || savingProfile || !!profileUploadError}>{preparingImages ? 'Klargjør bilde …' : savingProfile ? 'Laster opp …' : 'Lagre profil'}</button></form>{#if form?.profileError}<p class="form-error">{form.profileError}</p>{:else if form?.profileSaved}<p class="form-success">Profilen er lagret.</p>{/if}<a class="view-profile" href={`/bruker/${user.username}`}>Se profilen din</a></section>
        <section id="konto" class="section-card"><h2>Konto og medlemskap</h2><div class="profile-details"><p><strong>{user.realName}</strong><br/><span>@{user.username}</span></p><p>{user.email}</p><p><ShieldCheck size={16}/> Alpha-konto med e-post</p></div><div class="profile-actions"><a href="/minner">Minner på denne dagen</a><a href="/priser">Se abonnement</a><form method="POST" action="?/logout"><button>Logg ut</button></form></div></section>
        <section id="personvern" class="section-card preference-settings"><h2>Personvern og varsler</h2><p class="settings-help">Velg hva du vil se og hvilke hendelser Samvio skal varsle deg om.</p><form method="POST" action="?/updatePreferences"><label><input type="checkbox" name="hideCommercialContent" checked={data.preferences.hideCommercialContent}/><span><strong>Skjul kommersielt innhold</strong><small>Fjern tydelig merkede reklame- og sponsorinnlegg fra feeden.</small></span></label><label><input type="checkbox" name="notifyFollows" checked={data.preferences.notifyFollows}/><span><strong>Følgeforespørsler</strong><small>Vis varsler når noen ønsker å følge deg.</small></span></label><label><input type="checkbox" name="notifyComments" checked={data.preferences.notifyComments}/><span><strong>Kommentarer</strong><small>Vis varsler om nye kommentarer.</small></span></label><label><input type="checkbox" name="notifyReactions" checked={data.preferences.notifyReactions}/><span><strong>Likerklikk</strong><small>Vis varsler om nye likerklikk.</small></span></label><button>Lagre valg</button></form>{#if form?.preferencesSaved}<p class="form-success">Valgene er lagret.</p>{/if}</section>
        <details class="section-card danger-zone"><summary>Slett konto og innhold</summary><p>Dette sletter kontoen, følgerelasjoner, innlegg og opplastede bilder permanent.</p><form method="POST" action="?/deleteAccount"><label>Skriv SLETT for å bekrefte<input name="confirmation" autocomplete="off" required/></label><button>Slett kontoen permanent</button></form>{#if form?.deleteError}<p class="form-error">{form.deleteError}</p>{/if}</details>
      {/if}
    {:else}
      {@const section = copy[data.section]}
      <h1>{section.title}</h1><p class="section-intro">{section.intro}</p>
      <section class="section-card section-empty"><ShieldCheck size={36}/><h2>{section.emptyTitle}</h2><p>{section.emptyText}</p></section>
    {/if}
  </div>
  <style>.preference-settings form{display:grid;gap:14px}.preference-settings form>label{display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid #e1ded6;border-radius:11px;background:#fbfaf7;cursor:pointer}.preference-settings input[type="checkbox"]{width:18px;height:18px;margin-top:2px;accent-color:#315d49}.preference-settings label span{display:grid;gap:3px}.preference-settings label strong{font-size:13px}.preference-settings label small{color:#6f716e;font-size:11px;line-height:1.45}.preference-settings form>button{width:max-content}</style>
</main>

<style>.request-list h2{margin-top:0;font-size:16px}.request-list article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #ece9e2}.request-list article>a{display:flex;align-items:center;gap:10px}.request-list article>a>span{display:grid}.request-list small{color:#777}.request-list form{display:flex;gap:6px}.request-list button{padding:8px 11px;border:1px solid #315d49;border-radius:8px;background:#315d49;color:#fff;font-size:11px;font-weight:700}.request-list button.quiet{border-color:#d5d2ca;background:#fff;color:#555}@media(max-width:520px){.request-list article{align-items:flex-start;flex-direction:column}.request-list form{width:100%}.request-list button{flex:1}}</style>
