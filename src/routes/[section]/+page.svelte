<script lang="ts">
  import { Search, ShieldCheck, UserRound } from '@lucide/svelte';
  let { data, form } = $props();
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
  const pageTitle = $derived(data.section === 'profil' ? 'Profil' : data.section === 'sok' ? 'Søk' : infoCopy[data.section]?.title ?? copy[data.section]?.title ?? 'Samvio');
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
    {:else if data.section === 'profil'}
      {@const user = data.user}
      <h1>Profil</h1><p class="section-intro">Din konto og medlemskap.</p>
      {#if user}
        <section class="section-card"><div class="profile-details"><UserRound size={42}/><p><strong>{user.realName}</strong><br/><span>@{user.username}</span></p><p>{user.email}</p><p><ShieldCheck size={16}/> Alpha-konto med e-post</p></div><div class="profile-actions"><a href={`/bruker/${user.username}`}>Se din tidslinje</a><a href="/minner">Minner på denne dagen</a><a href="/priser">Se abonnement</a><form method="POST" action="?/logout"><button>Logg ut</button></form></div></section>
        <section class="section-card account-settings"><h2>Profiltekst</h2><form method="POST" action="?/updateProfile"><textarea name="bio" maxlength="300" rows="4" placeholder="Fortell kort hvem du er …">{data.profileBio ?? ''}</textarea><button>Lagre profiltekst</button></form>{#if form?.profileError}<p class="form-error">{form.profileError}</p>{:else if form?.profileSaved}<p class="form-success">Profilen er lagret.</p>{/if}</section>
        <details class="section-card danger-zone"><summary>Slett konto og innhold</summary><p>Dette sletter kontoen, følgerelasjoner, innlegg og opplastede bilder permanent.</p><form method="POST" action="?/deleteAccount"><label>Skriv SLETT for å bekrefte<input name="confirmation" autocomplete="off" required/></label><button>Slett kontoen permanent</button></form>{#if form?.deleteError}<p class="form-error">{form.deleteError}</p>{/if}</details>
      {/if}
    {:else}
      {@const section = copy[data.section]}
      <h1>{section.title}</h1><p class="section-intro">{section.intro}</p>
      <section class="section-card section-empty"><ShieldCheck size={36}/><h2>{section.emptyTitle}</h2><p>{section.emptyText}</p></section>
    {/if}
  </div>
</main>
