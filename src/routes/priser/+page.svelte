<script lang="ts">
  import { ShieldCheck } from '@lucide/svelte';
  import { plans } from '$lib/plans';
  let { data, form } = $props();
  const formatBytes = (bytes: number) => bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 * 1024 ? 0 : 1)} GB`
    : `${Math.round(bytes / 1024 / 1024)} MB`;
  const formatDate = (value: Date | string | null) => value
    ? new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
    : null;
</script>
<svelte:head><title>Priser – Samvio</title><meta name="description" content="En rettferdig prismodell uten annonser eller salg av persondata." /></svelte:head>
<main class="pricing-page">
  <header><span>En rettferdig modell</span><h1>Privatpersoner betaler minst.<br/>Organisasjoner bærer mer.</h1><p>Gratisversjonen er et fullverdig sosialt produkt. Betalte abonnement gir mer kapasitet og administrasjon — aldri bedre sikkerhet eller en bedre plass i feeden.</p></header>
  {#if data.loggedIn}
    <section class="current-plan">
      <div><small>Ditt abonnement</small><strong>{data.currentPlan === 'free' ? 'Gratis' : data.currentPlan === 'person' ? 'Person' : 'Familie'}</strong>{#if data.cancelAtPeriodEnd && data.currentPeriodEnd}<span>Avsluttes {formatDate(data.currentPeriodEnd)}</span>{/if}</div>
      <div><small>Lagring for innlegg</small><strong>{formatBytes(data.storageUsedBytes)} / {formatBytes(data.storageLimitBytes)}</strong></div>
      {#if data.currentPlan !== 'free' && !data.cancelAtPeriodEnd}
        <form method="POST" action="?/cancelSubscription"><button class="cancel-button">Avslutt abonnement</button></form>
      {/if}
    </section>
  {/if}
  <section class="plan-grid">
    {#each plans as plan}<article class:featured={plan.featured}>{#if plan.featured}<div class="badge">Familie</div>{/if}<p class="audience">{plan.audience}</p><h2>{plan.name}</h2><div class="price">{#if plan.monthlyPriceNok === null}<strong>Ta kontakt</strong>{:else}<strong>{plan.monthlyPriceNok} kr</strong><span>/ måned</span>{/if}</div><ul>{#each plan.features as feature}<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>{feature}</span></li>{/each}</ul>{#if data.currentPlan === plan.code}<button disabled>{data.cancelAtPeriodEnd ? 'Tilgang ut betalt periode' : 'Aktivt abonnement'}</button>{:else if data.vippsEnabled && plan.purchaseReady}<form method="POST" action="?/subscribe"><input type="hidden" name="plan" value={plan.code}/><button>{data.loggedIn ? 'Bestill med Vipps – betalingsplikt' : 'Logg inn for å velge'}</button></form>{:else}<button disabled>{plan.code === 'free' ? 'Inkludert' : plan.code === 'family' ? 'Familie kommer etter alpha-test' : 'Kommer i testfasen'}</button>{/if}</article>{/each}
  </section>
  {#if form?.paymentError}<p class="payment-message error" role="alert">{form.paymentError}</p>{/if}
  {#if form?.subscriptionCanceled}<p class="payment-message" role="status">Abonnementet er avsluttet. Du beholder betalt tilgang ut perioden.</p>{/if}
  {#if data.paymentStatus}<p class="payment-message" role="status">Vipps-avtalen har status: {data.paymentStatus}.</p>{/if}
  <aside><ShieldCheck size={23}/><p><strong>Trygghet er ikke en premiumfunksjon.</strong> Verifisering, blokkering, rapportering og beskyttelse av barn skal være tilgjengelig for alle.</p></aside>
</main>
<style>
  .pricing-page{min-height:100vh;padding:28px clamp(18px,5vw,70px) 70px;background:#fafafa}.pricing-page nav{max-width:1180px;margin:auto}.pricing-page nav a{display:inline-flex;align-items:center;gap:7px;font-size:12px}header{max-width:760px;margin:70px auto 35px;text-align:center}header>span{color:#315d49;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.13em}h1{margin:13px 0 17px;font:600 clamp(36px,6vw,58px)/1.03 'Newsreader',serif;letter-spacing:-1.5px}header p{max-width:670px;margin:auto;color:#686868;font-size:14px;line-height:1.7}.current-plan{max-width:860px;margin:0 auto 30px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:30px;border:1px solid #d9e4dc;border-radius:12px;background:#f0f5f2}.current-plan div{display:grid;gap:4px}.current-plan small{color:#68736c;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.current-plan strong{color:#315d49;font-size:14px}.current-plan span{color:#68736c;font-size:11px}.current-plan form{margin-left:auto}.current-plan .cancel-button{height:36px;padding:0 13px;border:1px solid #c8d4cc;border-radius:7px;background:#fff;color:#526158;font-size:11px;font-weight:700;cursor:pointer}.plan-grid{max-width:1180px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.plan-grid article{position:relative;min-height:410px;padding:28px 25px;display:flex;flex-direction:column;background:#fff;border:1px solid #ddd;border-radius:12px}.plan-grid article.featured{border:2px solid #315d49}.badge{position:absolute;right:17px;top:16px;padding:5px 8px;border-radius:20px;background:#e8f0eb;color:#315d49;font-size:9px;font-weight:700}.audience{margin:0;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.plan-grid h2{margin:9px 0 17px;font:600 27px 'Newsreader',serif}.price{min-height:42px;display:flex;align-items:baseline;gap:5px}.price strong{font-size:23px}.price span{color:#777;font-size:11px}ul{display:grid;gap:11px;margin:25px 0;padding:22px 0 0;border-top:1px solid #eee;list-style:none}li{display:flex;gap:9px;color:#555;font-size:12px}li svg{flex:none;color:#315d49}.plan-grid button{height:40px;margin-top:auto;border:1px solid #ddd;border-radius:7px;background:#f5f5f5;color:#999;font-size:11px;font-weight:700;cursor:not-allowed}aside{max-width:760px;margin:45px auto 0;padding:20px;display:flex;gap:13px;color:#315d49;background:#edf3ef;border-radius:10px}aside p{margin:0;color:#657069;font-size:12px;line-height:1.6}aside strong{color:#315d49}@media(max-width:900px){.plan-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:580px){header{margin-top:45px}.plan-grid{grid-template-columns:1fr}.plan-grid article{min-height:370px}.current-plan{align-items:stretch;flex-direction:column;gap:12px}.current-plan form{margin-left:0}}
  .plan-grid form{margin-top:auto}.plan-grid form button{width:100%;margin:0;border-color:#ff5b24;background:#ff5b24;color:#fff;cursor:pointer}.payment-message{max-width:760px;margin:24px auto 0;padding:13px 16px;border-radius:9px;background:#edf3ef;color:#315d49;text-align:center}.payment-message.error{background:#fff0ed;color:#9b3c2d}
</style>
