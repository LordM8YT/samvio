<script lang="ts">
  import { Check, Copy, HeartHandshake, Link2, Share2, UserPlus, Users } from '@lucide/svelte';

  let { data } = $props();
  let copied = $state(false);

  const invitePath = $derived(`/bli-med?fra=invitasjon&invitasjon=${encodeURIComponent(data.user.username)}`);
  const inviteUrl = () => `${window.location.origin}${invitePath}`;

  async function copyText(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  async function copyInvite() {
    await copyText(inviteUrl());
    copied = true;
    window.setTimeout(() => copied = false, 2200);
  }

  async function shareInvite() {
    const url = inviteUrl();
    const shareData = {
      title: 'Bli med på Samvio',
      text: `${data.user.realName ?? `@${data.user.username}`} inviterer deg til Samvio – et roligere sosialt sted med kronologisk feed.`,
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyInvite();
  }
</script>

<svelte:head>
  <title>Inviter venner – Samvio</title>
  <meta name="description" content="Inviter venner til Samvio med din personlige invitasjonslenke." />
</svelte:head>

<main class="invite-page">
  <section class="invite-shell">
    <header class="invite-heading">
      <span><UserPlus size={19}/> Inviter venner</span>
      <h1>Samvio blir bedre med folk du kjenner.</h1>
      <p>Del din personlige lenke med noen du faktisk vil ha i feeden din. Ingen poeng, ingen vervespam — bare en enklere måte å ta med gjengen på.</p>
    </header>

    <div class="invite-grid">
      <article class="share-card">
        <div class="card-icon"><HeartHandshake size={27}/></div>
        <small>Din personlige invitasjon</small>
        <h2>Ta med en venn</h2>
        <p>Når noen oppretter konto gjennom lenken din, husker Samvio at invitasjonen kom fra deg.</p>

        <div class="invite-link">
          <Link2 size={17}/>
          <span>samvio.no{invitePath}</span>
        </div>

        <div class="actions">
          <button class="primary" type="button" onclick={shareInvite}><Share2 size={18}/> Del invitasjon</button>
          <button class="secondary" type="button" onclick={copyInvite} aria-live="polite">
            {#if copied}<Check size={18}/> Kopiert{:else}<Copy size={18}/> Kopier lenke{/if}
          </button>
        </div>

        <a class="preview-link" href={invitePath}>Se hva vennen din får se</a>
      </article>

      <aside class="invite-side">
        <article>
          <span><Users size={21}/></span>
          <div><small>Blitt med via deg</small><strong>{data.invitedCount}</strong><p>{data.invitedCount === 1 ? 'person har opprettet konto via lenken din.' : 'personer har opprettet konto via lenken din.'}</p></div>
        </article>
        <article>
          <span><Share2 size={21}/></span>
          <div><small>Enklest på mobilen</small><strong>Bruk Del</strong><p>På iPhone og Android åpnes den vanlige delingsmenyen, så du kan sende lenken i Snap, Messenger, SMS og andre apper.</p></div>
        </article>
        <article>
          <span><HeartHandshake size={21}/></span>
          <div><small>Ingen belønningsjakt</small><strong>Folk først</strong><p>Samvio gir ikke ekstra rekkevidde eller fordeler for å invitere flest. Målet er bare å gjøre det enkelt å starte sammen.</p></div>
        </article>
      </aside>
    </div>
  </section>
</main>

<style>
  .invite-page{min-height:100vh;padding:48px 24px 90px;background:#f7f4ee;color:#1d2922}.invite-shell{width:min(940px,100%);margin:auto}.invite-heading{max-width:720px;margin-bottom:28px}.invite-heading>span{display:inline-flex;align-items:center;gap:7px;color:#315d49;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.invite-heading h1{margin:12px 0 12px;font:600 clamp(38px,6vw,56px)/1.02 'Newsreader',serif;letter-spacing:-1.2px}.invite-heading p{margin:0;color:#657068;font-size:14px;line-height:1.7}.invite-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(270px,.65fr);gap:18px}.share-card,.invite-side article{border:1px solid #ded9d0;border-radius:18px;background:#fff}.share-card{padding:30px}.card-icon{width:52px;height:52px;display:grid;place-items:center;margin-bottom:22px;border-radius:15px;background:#e9f1ec;color:#315d49}.share-card>small,.invite-side small{color:#858b86;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.share-card h2{margin:6px 0 8px;font:600 30px 'Newsreader',serif}.share-card>p{max-width:560px;margin:0;color:#677069;font-size:13px;line-height:1.65}.invite-link{display:flex;align-items:center;gap:10px;margin:24px 0 14px;padding:13px 14px;border:1px solid #d8ddd9;border-radius:11px;background:#f7f9f7;color:#315d49}.invite-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:700}.actions{display:flex;flex-wrap:wrap;gap:9px}.actions button{min-height:46px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:10px;font-size:12px;font-weight:850}.primary{border:1px solid #315d49;background:#315d49;color:#fff}.secondary{border:1px solid #d6d8d4;background:#fff;color:#315d49}.preview-link{display:inline-block;margin-top:16px;color:#657068;font-size:11px;text-decoration:underline;text-underline-offset:3px}.invite-side{display:grid;gap:12px}.invite-side article{display:flex;gap:13px;padding:18px}.invite-side article>span{width:39px;height:39px;display:grid;place-items:center;flex:none;border-radius:11px;background:#edf2ee;color:#315d49}.invite-side article div{display:grid;gap:3px}.invite-side strong{font:600 21px 'Newsreader',serif}.invite-side p{margin:1px 0 0;color:#707872;font-size:10.5px;line-height:1.5}@media(max-width:760px){.invite-page{padding:30px 16px calc(90px + env(safe-area-inset-bottom))}.invite-grid{grid-template-columns:1fr}.share-card{padding:22px}.actions button{flex:1}.invite-heading h1{font-size:39px}}@media(max-width:420px){.actions{display:grid;grid-template-columns:1fr}.invite-link span{font-size:10px}}
</style>
