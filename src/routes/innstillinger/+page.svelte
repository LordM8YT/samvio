<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import {
    Accessibility,
    Ban,
    Bell,
    ChevronRight,
    CircleHelp,
    Clock3,
    CreditCard,
    Database,
    Download,
    HardDrive,
    KeyRound,
    LockKeyhole,
    LogOut,
    Newspaper,
    Search,
    Settings2,
    ShieldCheck,
    TriangleAlert,
    UserRound
  } from '@lucide/svelte';
  import { compressImage } from '$lib/client/compress-image';

  let { data, form } = $props();
  let settingsSearch = $state('');
  let preparedAvatar: File | null = $state(null);
  let preparedCover: File | null = $state(null);
  let preparingImages = $state(0);
  let profileUploadError = $state('');
  let savingProfile = $state(false);

  type CategoryId = 'oversikt' | 'profil' | 'konto' | 'personvern' | 'sikkerhet' | 'varsler' | 'feed' | 'blokkering' | 'lagring' | 'data' | 'tilgjengelighet' | 'hjelp' | 'kontoadministrasjon';
  type Category = { id: CategoryId; title: string; description: string; keywords: string; icon: typeof Settings2 };

  const groups: Array<{ label: string; items: Category[] }> = [
    {
      label: 'Dine innstillinger',
      items: [
        { id: 'oversikt', title: 'Oversikt', description: 'Snarveier og kontostatus', keywords: 'start hjem status', icon: Settings2 },
        { id: 'profil', title: 'Profil', description: 'Bilder og profiltekst', keywords: 'avatar forside bilde bio profiltekst', icon: UserRound },
        { id: 'konto', title: 'Konto', description: 'Navn, brukernavn og e-post', keywords: 'navn brukernavn email e-post medlemskap', icon: UserRound },
        { id: 'personvern', title: 'Personvern', description: 'Hvem som kan følge deg', keywords: 'privat offentlig åpen følge forespørsel', icon: ShieldCheck },
        { id: 'sikkerhet', title: 'Sikkerhet og innlogging', description: 'Passord og aktive økter', keywords: 'passord login innlogging enheter økter logg ut', icon: LockKeyhole }
      ]
    },
    {
      label: 'Opplevelsen din',
      items: [
        { id: 'varsler', title: 'Varsler', description: 'Velg hva du varsles om', keywords: 'liker kommentarer følge push notification', icon: Bell },
        { id: 'feed', title: 'Feed og innhold', description: 'Kontroller hva feeden viser', keywords: 'feed innhold reklame sponsor kommersielt', icon: Newspaper },
        { id: 'blokkering', title: 'Blokkering', description: 'Administrer blokkerte kontoer', keywords: 'blokkerte brukere personer unblock', icon: Ban },
        { id: 'tilgjengelighet', title: 'Tilgjengelighet', description: 'Visning og bevegelse', keywords: 'tekst animasjon redusert bevegelse accessibility', icon: Accessibility }
      ]
    },
    {
      label: 'Data og betaling',
      items: [
        { id: 'lagring', title: 'Lagring og abonnement', description: 'Kvoter, plan og oppbevaring', keywords: 'gb plass abonnement pris lagring retention', icon: HardDrive },
        { id: 'data', title: 'Dine data', description: 'Historikk, minner og eksport', keywords: 'download last ned eksport historikk minner personvern', icon: Database }
      ]
    },
    {
      label: 'Støtte og kontroll',
      items: [
        { id: 'hjelp', title: 'Hjelp og om Samvio', description: 'Support, vilkår og personvern', keywords: 'support hjelp vilkår personvern om', icon: CircleHelp },
        { id: 'kontoadministrasjon', title: 'Kontoadministrasjon', description: 'Logg ut eller slett konto', keywords: 'slett deaktivere konto logout logg ut', icon: TriangleAlert }
      ]
    }
  ];

  const allCategories = groups.flatMap((group) => group.items);
  const activeCategory = $derived(allCategories.find((item) => item.id === data.category) ?? allCategories[0]);
  const ActiveIcon = $derived(activeCategory.icon);
  const displayName = $derived(data.user.realName ?? data.user.username ?? 'Samvio-bruker');
  const normalizedSearch = $derived(settingsSearch.trim().toLowerCase());
  const matchesSearch = (item: Category) => !normalizedSearch || `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(normalizedSearch);

  const planName = (code: string) => code === 'person' ? 'Person' : code === 'family' ? 'Familie' : 'Gratis';
  const formatBytes = (bytes: number | null) => {
    if (bytes === null) return '—';
    if (bytes < 1024 * 1024) return `${Math.max(0, bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };
  const storagePercent = $derived(data.storageUsage === null ? 0 : Math.min(100, Math.round((data.storageUsage / data.entitlements.storageLimitBytes) * 100)));

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
</script>

<svelte:head><title>Innstillinger – Samvio</title></svelte:head>

<main class="settings-page">
  <div class="settings-frame">
    <header class="settings-header">
      <div>
        <span>Samvio</span>
        <h1>Innstillinger og personvern</h1>
        <p>Administrer kontoen, personvernet og hvordan Samvio fungerer for deg.</p>
      </div>
      <a class="profile-link" href={`/bruker/${data.user.username}`}><UserRound size={17}/> Se profil</a>
    </header>

    <label class="settings-search">
      <Search size={19}/>
      <input bind:value={settingsSearch} type="search" placeholder="Søk i innstillinger" aria-label="Søk i innstillinger"/>
      {#if settingsSearch}<button type="button" onclick={() => settingsSearch = ''}>Tøm</button>{/if}
    </label>

    <div class="settings-workspace">
      <aside class="settings-sidebar" aria-label="Innstillingskategorier">
        {#each groups as group}
          {@const visibleItems = group.items.filter(matchesSearch)}
          {#if visibleItems.length}
            <section>
              <h2>{group.label}</h2>
              <nav>
                {#each visibleItems as item}
                  {@const Icon = item.icon}
                  <a class:active={activeCategory.id === item.id} aria-current={activeCategory.id === item.id ? 'page' : undefined} href={`/innstillinger?kategori=${item.id}`}>
                    <span class="nav-icon"><Icon size={18}/></span>
                    <span><strong>{item.title}</strong><small>{item.description}</small></span>
                    <ChevronRight class="nav-chevron" size={16}/>
                  </a>
                {/each}
              </nav>
            </section>
          {/if}
        {/each}
        {#if normalizedSearch && !allCategories.some(matchesSearch)}
          <div class="no-search-results"><Search size={22}/><strong>Ingen treff</strong><small>Prøv et annet søkeord.</small></div>
        {/if}
      </aside>

      <section class="settings-content">
        <header class="content-header">
          <span><ActiveIcon size={22}/></span>
          <div><h2>{activeCategory.title}</h2><p>{activeCategory.description}</p></div>
        </header>

        {#if activeCategory.id === 'oversikt'}
          <div class="overview-grid">
            <article class="summary-card account-summary">
              <span class="avatar-fallback">{displayName.slice(0, 1).toUpperCase()}</span>
              <div><small>Innlogget som</small><strong>{displayName}</strong><p>@{data.user.username} · {data.user.email}</p></div>
              <a href="/innstillinger?kategori=konto">Administrer</a>
            </article>

            <article class="metric-card"><ShieldCheck size={21}/><div><small>Profil</small><strong>{data.profileVisibility === 'private' ? 'Privat' : 'Åpen'}</strong><p>{data.profileVisibility === 'private' ? 'Følgeforespørsler må godkjennes.' : 'Andre kan følge deg med én gang.'}</p></div><a href="/innstillinger?kategori=personvern"><ChevronRight size={18}/></a></article>
            <article class="metric-card"><CreditCard size={21}/><div><small>Abonnement</small><strong>{planName(data.entitlements.planCode)}</strong><p>{data.entitlements.retentionDays >= 1800 ? 'Innlegg beholdes i opptil 5 år.' : 'Innlegg beholdes i opptil 12 måneder.'}</p></div><a href="/innstillinger?kategori=lagring"><ChevronRight size={18}/></a></article>
            <article class="metric-card"><KeyRound size={21}/><div><small>Sikkerhet</small><strong>{data.activeSessions.length} aktive {data.activeSessions.length === 1 ? 'økt' : 'økter'}</strong><p>Administrer passord og innlogging.</p></div><a href="/innstillinger?kategori=sikkerhet"><ChevronRight size={18}/></a></article>
            <article class="metric-card"><Ban size={21}/><div><small>Blokkering</small><strong>{data.blockedUsers.length} blokkerte</strong><p>Se eller fjern blokkerte kontoer.</p></div><a href="/innstillinger?kategori=blokkering"><ChevronRight size={18}/></a></article>
          </div>

          <article class="settings-card storage-overview">
            <div class="card-heading"><div><small>Lagring</small><h3>{formatBytes(data.storageUsage)} av {formatBytes(data.entitlements.storageLimitBytes)}</h3></div><strong>{storagePercent}%</strong></div>
            <div class="storage-bar" aria-label={`${storagePercent}% lagring brukt`}><i style={`width:${storagePercent}%`}></i></div>
            <div class="card-footer"><span>Plan: {planName(data.entitlements.planCode)}</span><a href="/innstillinger?kategori=lagring">Se detaljer <ChevronRight size={15}/></a></div>
          </article>

          <div class="quick-settings">
            <h3>Vanlige innstillinger</h3>
            {#each allCategories.filter((item) => ['profil', 'varsler', 'feed', 'data'].includes(item.id)) as item}
              {@const Icon = item.icon}
              <a href={`/innstillinger?kategori=${item.id}`}><span><Icon size={18}/></span><div><strong>{item.title}</strong><small>{item.description}</small></div><ChevronRight size={17}/></a>
            {/each}
          </div>

        {:else if activeCategory.id === 'profil'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Offentlig profil</small><h3>Profilbilder og profiltekst</h3><p>Dette er det andre ser når de åpner profilen din.</p></div></div>
            <form class="settings-form" method="POST" action="?/updateProfile&kategori=profil" enctype="multipart/form-data" use:enhance={submitProfile}>
              <div class="image-fields">
                <label><strong>Profilbilde</strong><span>{preparedAvatar ? `Klargjort · ${(preparedAvatar.size / 1024 / 1024).toFixed(1)} MB` : data.profileImages.avatar ? 'Du har et profilbilde' : 'Ikke satt'}</span><input name="avatar" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={(event) => prepareProfileImage(event, 'avatar')}/></label>
                <label><strong>Forsidebilde</strong><span>{preparedCover ? `Klargjort · ${(preparedCover.size / 1024 / 1024).toFixed(1)} MB` : data.profileImages.cover ? 'Du har et forsidebilde' : 'Ikke satt'}</span><input name="cover" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={(event) => prepareProfileImage(event, 'cover')}/></label>
              </div>
              <label class="field"><span>Om deg</span><textarea name="bio" maxlength="300" rows="5" placeholder="Fortell kort hvem du er …">{data.profileBio ?? ''}</textarea><small>Maks 300 tegn.</small></label>
              {#if profileUploadError}<p class="form-message error" role="alert">{profileUploadError}</p>{/if}
              {#if form?.profileError}<p class="form-message error">{form.profileError}</p>{:else if form?.profileSaved}<p class="form-message success">Profilen er lagret.</p>{/if}
              <div class="form-actions"><a href={`/bruker/${data.user.username}`}>Forhåndsvis profil</a><button disabled={!!preparingImages || savingProfile || !!profileUploadError}>{preparingImages ? 'Klargjør bilde …' : savingProfile ? 'Lagrer …' : 'Lagre endringer'}</button></div>
            </form>
          </article>

        {:else if activeCategory.id === 'konto'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Kontoinformasjon</small><h3>Navn og brukernavn</h3><p>Brukernavnet brukes i profiladressen din og må være unikt.</p></div></div>
            <form class="settings-form" method="POST" action="?/updateIdentity&kategori=konto">
              <label class="field"><span>Navn</span><input name="realName" value={data.user.realName} minlength="2" maxlength="120" required/></label>
              <label class="field"><span>Brukernavn</span><div class="input-prefix"><i>@</i><input name="username" value={data.user.username} minlength="3" maxlength="30" pattern="[a-z0-9_]+" required/></div><small>Små bokstaver, tall og understrek.</small></label>
              {#if form?.accountError}<p class="form-message error">{form.accountError}</p>{:else if form?.accountSaved}<p class="form-message success">Kontoinformasjonen er lagret.</p>{/if}
              <div class="form-actions"><span></span><button>Lagre kontoinformasjon</button></div>
            </form>
          </article>
          <article class="settings-card row-card"><div><small>Innloggingsadresse</small><h3>{data.user.email}</h3><p>E-postendring blir aktivert sammen med full e-postverifisering.</p></div><span class="status-badge">Alpha</span></article>
          <article class="settings-card row-card"><div><small>Medlemskap</small><h3>{planName(data.entitlements.planCode)}</h3><p>Administrer plan, pris og lagringsgrenser.</p></div><a class="secondary-button" href="/priser">Se abonnement</a></article>

        {:else if activeCategory.id === 'personvern'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Profilpersonvern</small><h3>Hvem kan følge deg?</h3><p>Velg om nye følgere må godkjennes først.</p></div><ShieldCheck size={22}/></div>
            <form class="settings-form" method="POST" action="?/updatePrivacy&kategori=personvern">
              <fieldset class="choice-list">
                <label><input type="radio" name="profileVisibility" value="private" checked={data.profileVisibility === 'private'}/><span><strong>Privat profil</strong><small>Du godkjenner hver følgeforespørsel før personen får følge deg.</small></span><i></i></label>
                <label><input type="radio" name="profileVisibility" value="public" checked={data.profileVisibility === 'public'}/><span><strong>Åpen profil</strong><small>Andre kan følge deg med én gang uten godkjenning.</small></span><i></i></label>
              </fieldset>
              {#if form?.privacyError}<p class="form-message error">{form.privacyError}</p>{:else if form?.privacySaved}<p class="form-message success">Personvernvalget er lagret.</p>{/if}
              <div class="form-actions"><span></span><button>Lagre personvern</button></div>
            </form>
          </article>
          <article class="settings-card info-card"><ShieldCheck size={21}/><div><strong>Personvern er ikke en betalingsfunksjon</strong><p>De samme sikkerhets- og personvernvalgene er tilgjengelige uansett abonnement.</p></div></article>

        {:else if activeCategory.id === 'sikkerhet'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Passord</small><h3>Bytt passord</h3><p>Etter passordbytte blir alle aktive økter logget ut.</p></div><KeyRound size={22}/></div>
            <form class="settings-form" method="POST" action="?/changePassword&kategori=sikkerhet">
              <label class="field"><span>Nåværende passord</span><input name="currentPassword" type="password" autocomplete="current-password" required/></label>
              <label class="field"><span>Nytt passord</span><input name="newPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required/><small>Minst 8 tegn.</small></label>
              <label class="field"><span>Gjenta nytt passord</span><input name="confirmPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required/></label>
              {#if form?.passwordError}<p class="form-message error">{form.passwordError}</p>{/if}
              <div class="form-actions"><span></span><button>Bytt passord</button></div>
            </form>
          </article>
          <article class="settings-card">
            <div class="card-heading"><div><small>Aktive økter</small><h3>{data.activeSessions.length} {data.activeSessions.length === 1 ? 'innlogging' : 'innlogginger'}</h3><p>Samvio lagrer foreløpig ikke enhetsnavn eller IP-adresse i øktene.</p></div><LockKeyhole size={22}/></div>
            {#if data.activeSessions.length}
              <div class="session-list">
                {#each data.activeSessions as session, index}
                  <div><span><LockKeyhole size={17}/></span><div><strong>{index === 0 ? 'Nyeste aktive økt' : 'Aktiv økt'}</strong><small>Opprettet {session.createdAt.toLocaleString('nb-NO')} · utløper {session.expiresAt.toLocaleDateString('nb-NO')}</small></div></div>
                {/each}
              </div>
            {/if}
            <form class="inline-danger" method="POST" action="?/logoutAll&kategori=sikkerhet"><button><LogOut size={16}/> Logg ut av alle enheter</button></form>
          </article>

        {:else if activeCategory.id === 'varsler'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Varslingsvalg</small><h3>Hva vil du varsles om?</h3><p>Disse valgene styrer varsler inne i Samvio.</p></div><Bell size={22}/></div>
            <form class="settings-form" method="POST" action="?/updateNotifications&kategori=varsler">
              <fieldset class="toggle-list">
                <label><span><strong>Følgeforespørsler</strong><small>Når noen ønsker å følge deg.</small></span><input class="toggle-input" type="checkbox" name="notifyFollows" checked={data.preferences.notifyFollows}/><i class="toggle" aria-hidden="true"></i></label>
                <label><span><strong>Kommentarer</strong><small>Når noen kommenterer på innleggene dine.</small></span><input class="toggle-input" type="checkbox" name="notifyComments" checked={data.preferences.notifyComments}/><i class="toggle" aria-hidden="true"></i></label>
                <label><span><strong>Likerklikk</strong><small>Når noen liker et innlegg du har delt.</small></span><input class="toggle-input" type="checkbox" name="notifyReactions" checked={data.preferences.notifyReactions}/><i class="toggle" aria-hidden="true"></i></label>
              </fieldset>
              {#if form?.notificationsSaved}<p class="form-message success">Varslingsvalgene er lagret.</p>{/if}
              <div class="form-actions"><span></span><button>Lagre varsler</button></div>
            </form>
          </article>
          <article class="settings-card row-card"><div><small>Push og e-post</small><h3>Flere varslingskanaler kommer senere</h3><p>Når Samvio får push- og e-postvarsler, havner kontrollene her i stedet for på tilfeldige sider.</p></div><span class="status-badge">Planlagt</span></article>

        {:else if activeCategory.id === 'feed'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Feed</small><h3>Innholdsvalg</h3><p>Hovedfeeden forblir kronologisk. Her styrer du bare hvilke typer innhold som kan vises.</p></div><Newspaper size={22}/></div>
            <form class="settings-form" method="POST" action="?/updateFeed&kategori=feed">
              <fieldset class="toggle-list">
                <label><span><strong>Skjul kommersielt innhold</strong><small>Fjern merkede reklame- og sponsorinnlegg fra feeden din.</small></span><input class="toggle-input" type="checkbox" name="hideCommercialContent" checked={data.preferences.hideCommercialContent}/><i class="toggle" aria-hidden="true"></i></label>
              </fieldset>
              {#if form?.feedSaved}<p class="form-message success">Feedvalget er lagret.</p>{/if}
              <div class="form-actions"><span></span><button>Lagre feedvalg</button></div>
            </form>
          </article>
          <article class="settings-card info-card"><Clock3 size={21}/><div><strong>Ingen algoritmisk sortering</strong><p>Samvio-feeden vises kronologisk og stopper når du er ajour. Dette kan ikke kjøpes bort eller skrus om til en anbefalingsfeed.</p></div></article>

        {:else if activeCategory.id === 'blokkering'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Blokkerte kontoer</small><h3>{data.blockedUsers.length} {data.blockedUsers.length === 1 ? 'konto' : 'kontoer'}</h3><p>Blokkerte personer kan ikke følge deg eller se profilen din som normalt.</p></div><Ban size={22}/></div>
            {#if data.blockedUsers.length}
              <div class="blocked-list">
                {#each data.blockedUsers as person}
                  <div><span class="mini-avatar">{person.realName.slice(0, 1).toUpperCase()}</span><div><strong>{person.realName}</strong><small>@{person.username} · blokkert {person.createdAt.toLocaleDateString('nb-NO')}</small></div><form method="POST" action="?/unblock&kategori=blokkering"><input type="hidden" name="targetId" value={person.userId}/><button>Fjern blokkering</button></form></div>
                {/each}
              </div>
            {:else}
              <div class="empty-state"><Ban size={30}/><strong>Ingen blokkerte kontoer</strong><p>Personer du blokkerer vil vises her.</p></div>
            {/if}
            {#if form?.unblockError}<p class="form-message error">{form.unblockError}</p>{:else if form?.unblocked}<p class="form-message success">Blokkeringen er fjernet.</p>{/if}
          </article>

        {:else if activeCategory.id === 'lagring'}
          <article class="settings-card storage-detail">
            <div class="card-heading"><div><small>Lagringsbruk</small><h3>{formatBytes(data.storageUsage)} av {formatBytes(data.entitlements.storageLimitBytes)}</h3><p>{storagePercent}% av lagringskvoten er brukt.</p></div><HardDrive size={22}/></div>
            <div class="storage-bar large"><i style={`width:${storagePercent}%`}></i></div>
            <div class="storage-stats">
              <div><small>Plan</small><strong>{planName(data.entitlements.planCode)}</strong></div>
              <div><small>Oppbevaring</small><strong>{data.entitlements.retentionDays >= 1800 ? 'Opptil 5 år' : 'Opptil 12 mnd.'}</strong></div>
              <div><small>Bildekvalitet</small><strong>{data.entitlements.originalImageQuality ? 'Original' : 'Optimalisert'}</strong></div>
            </div>
            <div class="card-footer"><span>Når kvoten er full stoppes nye bildeopplastinger. Gamle innlegg slettes etter egen oppbevaringsregel.</span><a href="/priser">Endre abonnement <ChevronRight size={15}/></a></div>
          </article>

        {:else if activeCategory.id === 'data'}
          <div class="link-list">
            <a href="/historikk"><span><Clock3 size={19}/></span><div><strong>Innleggshistorikk</strong><small>Se tidligere innlegg og det som utløper snart.</small></div><ChevronRight size={18}/></a>
            <a href="/minner"><span><Clock3 size={19}/></span><div><strong>Minner</strong><small>Se innlegg fra denne dagen tidligere år.</small></div><ChevronRight size={18}/></a>
            <a href="/personvern"><span><ShieldCheck size={19}/></span><div><strong>Personverninformasjon</strong><small>Les hvordan Samvio behandler data i alphaen.</small></div><ChevronRight size={18}/></a>
          </div>
          <article class="settings-card row-card"><div><small>Dataeksport</small><h3>Last ned en kopi av dataene dine</h3><p>Full selveksport bygges før offentlig lansering. Vi viser funksjonen her allerede slik at settings-strukturen er klar.</p></div><span class="status-badge"><Download size={13}/> Planlagt</span></article>

        {:else if activeCategory.id === 'tilgjengelighet'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Tilgjengelighet</small><h3>Visning og bevegelse</h3><p>Samvio skal fungere med tastatur, zoom og hjelpemidler uten at du må lete etter skjulte valg.</p></div><Accessibility size={22}/></div>
            <div class="coming-list">
              <div><span><Accessibility size={18}/></span><div><strong>Redusert bevegelse</strong><small>Egen kontoinnstilling kommer. Nettleserens/systemets preferanse skal fortsatt respekteres.</small></div><span class="status-badge">Planlagt</span></div>
              <div><span><Search size={18}/></span><div><strong>Tekst og kontrast</strong><small>Flere visningsvalg legges her når vi har testet dem med ekte brukere.</small></div><span class="status-badge">Planlagt</span></div>
            </div>
          </article>

        {:else if activeCategory.id === 'hjelp'}
          <div class="link-list">
            <a href="/hjelp"><span><CircleHelp size={19}/></span><div><strong>Hjelp og support</strong><small>Finn kontaktinformasjon og hjelp for alphaen.</small></div><ChevronRight size={18}/></a>
            <a href="/vilkar"><span><Database size={19}/></span><div><strong>Vilkår</strong><small>Les vilkårene som gjelder for Samvio alpha.</small></div><ChevronRight size={18}/></a>
            <a href="/personvern"><span><ShieldCheck size={19}/></span><div><strong>Personvern</strong><small>Se personvernsammendraget.</small></div><ChevronRight size={18}/></a>
          </div>
          <article class="settings-card info-card"><CircleHelp size={21}/><div><strong>Settings skal være stedet du forventer</strong><p>Nye konto-, sikkerhets- og personvernvalg legges inn i denne strukturen i stedet for å spre dem rundt i appen.</p></div></article>

        {:else if activeCategory.id === 'kontoadministrasjon'}
          <article class="settings-card">
            <div class="card-heading"><div><small>Innlogging</small><h3>Logg ut</h3><p>Avslutt bare denne økten. Andre aktive økter påvirkes ikke.</p></div><LogOut size={22}/></div>
            <form class="inline-action" method="POST" action="?/logout&kategori=kontoadministrasjon"><button><LogOut size={16}/> Logg ut av Samvio</button></form>
          </article>
          <article class="settings-card danger-card">
            <div class="card-heading"><div><small>Permanent handling</small><h3>Slett konto og innhold</h3><p>Dette sletter kontoen, følgerelasjoner, innlegg, profilbilder og opplastede medier permanent.</p></div><TriangleAlert size={22}/></div>
            <form class="settings-form" method="POST" action="?/deleteAccount&kategori=kontoadministrasjon">
              <label class="field"><span>Skriv SLETT for å bekrefte</span><input name="confirmation" autocomplete="off" placeholder="SLETT" required/></label>
              {#if form?.deleteError}<p class="form-message error">{form.deleteError}</p>{/if}
              <div class="form-actions"><span></span><button class="danger-button">Slett kontoen permanent</button></div>
            </form>
          </article>
        {/if}
      </section>
    </div>
  </div>
</main>

<style>
  :global(body){background:#f4f2ed}
  .settings-page{min-height:100vh;padding:34px 22px 90px;color:#1d231f;background:radial-gradient(circle at 85% 0,#e6eee8 0,transparent 31rem),#f4f2ed}
  .settings-frame{width:min(1160px,100%);margin:auto}
  .settings-header{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:22px}
  .settings-header>div>span{color:#315d49;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
  .settings-header h1{margin:7px 0 5px;font:600 clamp(32px,5vw,46px)/1.02 'Newsreader',serif;letter-spacing:-.7px}
  .settings-header p{max-width:660px;margin:0;color:#707570;font-size:13px;line-height:1.55}
  .profile-link{display:flex;align-items:center;gap:7px;flex:none;padding:10px 13px;border:1px solid #d7d8d2;border-radius:10px;background:#fff;color:#315d49;font-size:11px;font-weight:800}
  .settings-search{height:50px;display:flex;align-items:center;gap:11px;margin-bottom:18px;padding:0 15px;border:1px solid #d9d7d0;border-radius:14px;background:#fff;box-shadow:0 8px 28px #24372c08;color:#6f7771}
  .settings-search:focus-within{border-color:#9bb9a7;box-shadow:0 0 0 3px #dfece4}
  .settings-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#1f2622;font:13px 'DM Sans',sans-serif}
  .settings-search button{border:0;background:transparent;color:#315d49;font-size:10px;font-weight:800;cursor:pointer}
  .settings-workspace{display:grid;grid-template-columns:300px minmax(0,1fr);align-items:start;gap:18px}
  .settings-sidebar{position:sticky;top:18px;overflow:hidden;border:1px solid #ddd9d0;border-radius:18px;background:#fff;box-shadow:0 12px 34px #26382f09}
  .settings-sidebar section{padding:15px 10px 8px}
  .settings-sidebar section+section{border-top:1px solid #ece9e2}
  .settings-sidebar h2{margin:0 10px 7px;color:#8a8e8a;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
  .settings-sidebar nav{display:grid;gap:2px}
  .settings-sidebar a{display:grid;grid-template-columns:34px minmax(0,1fr) 18px;align-items:center;gap:10px;padding:9px 9px;border-radius:11px;color:#4d554f}
  .settings-sidebar a:hover{background:#f7f5f0}
  .settings-sidebar a.active{background:#eaf2ed;color:#234a38}
  .nav-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#f3f2ee;color:#65716a}
  .settings-sidebar a.active .nav-icon{background:#315d49;color:#fff}
  .settings-sidebar a>span:nth-child(2){min-width:0;display:grid;gap:2px}
  .settings-sidebar strong{font-size:11px}
  .settings-sidebar small{overflow:hidden;color:#878b87;font-size:9px;text-overflow:ellipsis;white-space:nowrap}
  .nav-chevron{color:#a6aaa6}
  .no-search-results{display:grid;place-items:center;gap:5px;padding:35px 20px;color:#777;text-align:center}.no-search-results strong{font-size:12px}.no-search-results small{font-size:10px}
  .settings-content{min-width:0;display:grid;gap:14px}
  .content-header{min-height:72px;display:flex;align-items:center;gap:13px;padding:14px 18px;border:1px solid #ddd9d0;border-radius:18px;background:#fff;box-shadow:0 12px 34px #26382f07}
  .content-header>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#315d49;color:#fff}
  .content-header h2{margin:0;font:600 25px 'Newsreader',serif}.content-header p{margin:2px 0 0;color:#777d78;font-size:10px}
  .settings-card,.quick-settings,.link-list{border:1px solid #ddd9d0;border-radius:18px;background:#fff;box-shadow:0 12px 34px #26382f07}
  .settings-card{overflow:hidden}
  .card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid #ece9e2}
  .card-heading>svg{flex:none;color:#315d49}
  .card-heading small,.row-card small,.metric-card small,.account-summary small,.storage-stats small{display:block;color:#8a8e8a;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
  .card-heading h3,.row-card h3{margin:4px 0 4px;font:600 21px 'Newsreader',serif}
  .card-heading p,.row-card p{max-width:590px;margin:0;color:#727772;font-size:11px;line-height:1.55}
  .settings-form{display:grid;gap:16px;padding:20px 22px}
  .field{display:grid;gap:7px;color:#38413b;font-size:11px;font-weight:800}.field>small{color:#858985;font-size:9px;font-weight:500}
  .field input,.field textarea{width:100%;padding:11px 12px;border:1px solid #d8d7d1;border-radius:10px;outline:0;background:#fff;color:#1d231f;font:12px 'DM Sans',sans-serif}.field textarea{resize:vertical;line-height:1.55}.field input:focus,.field textarea:focus{border-color:#90b09c;box-shadow:0 0 0 3px #e4eee8}
  .input-prefix{display:flex;align-items:center;border:1px solid #d8d7d1;border-radius:10px;background:#fff}.input-prefix:focus-within{border-color:#90b09c;box-shadow:0 0 0 3px #e4eee8}.input-prefix i{padding-left:12px;color:#777;font-style:normal}.input-prefix input{border:0;box-shadow:none!important}
  .image-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.image-fields label{display:grid;gap:5px;padding:14px;border:1px solid #dedbd4;border-radius:12px;background:#faf9f6}.image-fields strong{font-size:11px}.image-fields span{color:#777;font-size:9px}.image-fields input{max-width:100%;margin-top:5px;font-size:9px}
  .form-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:3px}.form-actions>a{color:#315d49;font-size:10px;font-weight:800}.form-actions button,.inline-action button,.inline-danger button{padding:10px 14px;border:0;border-radius:9px;background:#315d49;color:#fff;font-size:10px;font-weight:800;cursor:pointer}.form-actions button:disabled{opacity:.55;cursor:not-allowed}
  .form-message{margin:0;padding:10px 12px;border-radius:9px;font-size:10px}.form-message.success{background:#e9f3ed;color:#315d49}.form-message.error{background:#fff0ed;color:#9b3c2d}
  .overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .account-summary{grid-column:1/-1;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:13px;padding:18px}.avatar-fallback,.mini-avatar{display:grid;place-items:center;border-radius:50%;background:#315d49;color:#fff;font-weight:800}.avatar-fallback{width:52px;height:52px;font-size:17px}.account-summary strong{display:block;margin:3px 0;font-size:13px}.account-summary p{margin:0;color:#777;font-size:10px}.account-summary a{color:#315d49;font-size:10px;font-weight:800}
  .summary-card,.metric-card{border:1px solid #ddd9d0;border-radius:15px;background:#fff;box-shadow:0 10px 28px #26382f07}
  .metric-card{display:grid;grid-template-columns:38px minmax(0,1fr) 30px;align-items:center;gap:10px;padding:15px}.metric-card>svg{width:38px;height:38px;padding:9px;border-radius:11px;background:#edf3ef;color:#315d49}.metric-card strong{display:block;margin:3px 0;font-size:12px}.metric-card p{margin:0;color:#777;font-size:9px;line-height:1.4}.metric-card>a{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;color:#77817a}.metric-card>a:hover{background:#f2f4f2}
  .storage-overview{padding:19px 21px}.storage-overview .card-heading,.storage-detail .card-heading{padding:0 0 14px;border:0}.storage-overview .card-heading h3{margin:4px 0 0;font:600 20px 'Newsreader',serif}.storage-overview .card-heading>strong{color:#315d49;font:600 23px 'Newsreader',serif}
  .storage-bar{height:9px;overflow:hidden;border-radius:999px;background:#e5e9e6}.storage-bar i{display:block;height:100%;min-width:2px;border-radius:inherit;background:linear-gradient(90deg,#315d49,#73a68a)}.storage-bar.large{height:12px;margin:0 22px 19px}
  .card-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px;color:#777;font-size:9px}.card-footer>a{display:flex;align-items:center;gap:4px;color:#315d49;font-weight:800}
  .quick-settings{overflow:hidden}.quick-settings>h3{margin:0;padding:16px 18px 9px;color:#707570;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.quick-settings>a,.link-list>a{display:grid;grid-template-columns:38px minmax(0,1fr) 22px;align-items:center;gap:11px;padding:13px 17px;border-top:1px solid #ece9e2}.quick-settings>a>span,.link-list>a>span{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:#edf3ef;color:#315d49}.quick-settings>a>div,.link-list>a>div{display:grid;gap:3px}.quick-settings strong,.link-list strong{font-size:11px}.quick-settings small,.link-list small{color:#7d827e;font-size:9px}.quick-settings>a>svg,.link-list>a>svg{color:#9da29e}
  .row-card{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 21px}.row-card>div{min-width:0}.secondary-button{flex:none;padding:9px 12px;border:1px solid #cbd7cf;border-radius:9px;background:#f3f7f4;color:#315d49;font-size:10px;font-weight:800}.status-badge{display:inline-flex;align-items:center;gap:5px;flex:none;padding:6px 8px;border-radius:999px;background:#f0f1ee;color:#6f746f;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
  .choice-list,.toggle-list{display:grid;margin:0;padding:0;border:1px solid #e1ded7;border-radius:13px}.choice-list label,.toggle-list label{position:relative;display:flex;align-items:center;gap:14px;min-height:72px;padding:13px 15px;cursor:pointer}.choice-list label+label,.toggle-list label+label{border-top:1px solid #ece9e2}.choice-list input{position:absolute;opacity:0}.choice-list label>span,.toggle-list label>span{min-width:0;display:grid;gap:4px;flex:1}.choice-list strong,.toggle-list strong{font-size:11px}.choice-list small,.toggle-list small{color:#777d78;font-size:9px;line-height:1.45}.choice-list label>i{width:20px;height:20px;flex:none;border:2px solid #c5cac6;border-radius:50%;box-shadow:inset 0 0 0 4px #fff}.choice-list input:checked~i{border-color:#315d49;background:#315d49}
  .toggle-input{position:absolute;width:1px;height:1px;opacity:0}.toggle{position:relative;width:44px;height:25px;flex:none;border-radius:999px;background:#c9ccc9;box-shadow:inset 0 0 0 1px #b9bdb9;transition:.18s}.toggle::after{content:'';position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 2px 5px #0002;transition:.18s}.toggle-input:checked+.toggle{background:#315d49;box-shadow:inset 0 0 0 1px #315d49}.toggle-input:checked+.toggle::after{transform:translateX(19px)}.toggle-input:focus-visible+.toggle{outline:3px solid #b7d2c3;outline-offset:2px}
  .info-card{display:flex;align-items:flex-start;gap:12px;padding:17px 19px;color:#315d49;background:#f4f8f5}.info-card svg{flex:none}.info-card strong{font-size:11px}.info-card p{margin:4px 0 0;color:#66716a;font-size:9px;line-height:1.5}
  .session-list,.blocked-list,.coming-list{display:grid}.session-list>div,.blocked-list>div,.coming-list>div{display:flex;align-items:center;gap:11px;padding:13px 20px;border-bottom:1px solid #ece9e2}.session-list>div>span,.coming-list>div>span:first-child{width:36px;height:36px;display:grid;place-items:center;flex:none;border-radius:11px;background:#edf3ef;color:#315d49}.session-list>div>div,.blocked-list>div>div,.coming-list>div>div{min-width:0;display:grid;gap:3px;flex:1}.session-list strong,.blocked-list strong,.coming-list strong{font-size:10px}.session-list small,.blocked-list small,.coming-list small{color:#7e837f;font-size:8px;line-height:1.4}.inline-danger,.inline-action{display:flex;justify-content:flex-end;padding:15px 20px}.inline-danger button{display:flex;align-items:center;gap:6px;border:1px solid #d8c4bf;background:#fff4f1;color:#9b3c2d}.inline-action button{display:flex;align-items:center;gap:6px}
  .blocked-list .mini-avatar{width:38px;height:38px;flex:none;font-size:12px}.blocked-list form button{padding:8px 10px;border:1px solid #d8d7d1;border-radius:8px;background:#fff;color:#555d57;font-size:9px;font-weight:800;cursor:pointer}
  .empty-state{min-height:220px;display:grid;place-items:center;align-content:center;gap:7px;padding:25px;color:#7b817c;text-align:center}.empty-state strong{color:#313833;font-size:12px}.empty-state p{margin:0;font-size:9px}
  .storage-detail{padding:20px 0 0}.storage-detail .card-heading{padding:0 22px 16px}.storage-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;border-top:1px solid #ece9e2;border-bottom:1px solid #ece9e2;background:#ece9e2}.storage-stats>div{padding:15px 18px;background:#fff}.storage-stats strong{display:block;margin-top:4px;font-size:11px}.storage-detail .card-footer{margin:0;padding:15px 20px}.storage-detail .card-footer>span{max-width:500px;line-height:1.45}
  .coming-list .status-badge{margin-left:auto}
  .danger-card{border-color:#e3c8c2}.danger-card .card-heading{background:#fff6f4}.danger-card .card-heading small,.danger-card .card-heading>svg{color:#9b3c2d}.danger-button{background:#9b3c2d!important}
  @media(max-width:900px){.settings-workspace{grid-template-columns:240px minmax(0,1fr)}.settings-sidebar small{display:none}.settings-sidebar a{grid-template-columns:34px minmax(0,1fr) 18px}.overview-grid{grid-template-columns:1fr}.account-summary{grid-column:auto}.storage-stats{grid-template-columns:1fr 1fr 1fr}}
  @media(max-width:700px){.settings-page{padding:18px 12px calc(90px + env(safe-area-inset-bottom))}.settings-header{align-items:flex-start;flex-direction:column;gap:12px}.settings-header h1{font-size:34px}.profile-link{display:none}.settings-search{position:sticky;top:8px;z-index:8;margin-bottom:12px;box-shadow:0 8px 24px #0001}.settings-workspace{display:block}.settings-sidebar{position:static;margin-bottom:12px}.settings-sidebar section{padding:9px}.settings-sidebar h2{display:none}.settings-sidebar nav{display:flex;overflow-x:auto;gap:5px;padding-bottom:1px}.settings-sidebar section+section{border:0}.settings-sidebar a{min-width:max-content;grid-template-columns:30px auto;padding:8px 10px;border:1px solid transparent}.settings-sidebar a.active{border-color:#c9dbcf}.settings-sidebar a>span:nth-child(2){display:block}.settings-sidebar a small,.nav-chevron{display:none}.nav-icon{width:30px;height:30px}.content-header{min-height:64px;border-radius:15px}.content-header h2{font-size:22px}.settings-card,.quick-settings,.link-list{border-radius:15px}.card-heading,.settings-form{padding-left:16px;padding-right:16px}.image-fields{grid-template-columns:1fr}.overview-grid{gap:9px}.account-summary{grid-template-columns:45px minmax(0,1fr)}.avatar-fallback{width:45px;height:45px}.account-summary>a{grid-column:2}.metric-card{grid-template-columns:36px minmax(0,1fr) 28px}.row-card{align-items:flex-start;flex-direction:column}.storage-stats{grid-template-columns:1fr}.storage-stats>div+div{border-top:1px solid #ece9e2}.card-footer{align-items:flex-start;flex-direction:column}.blocked-list>div{align-items:flex-start;flex-wrap:wrap}.blocked-list form{width:100%;padding-left:49px}.coming-list>div{align-items:flex-start;flex-wrap:wrap}.coming-list .status-badge{margin-left:47px}.form-actions{align-items:stretch;flex-direction:column}.form-actions>span:empty{display:none}.form-actions button{width:100%}}
</style>
