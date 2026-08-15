<script lang="ts">
  import { ArrowRight, Check, Clock3, HeartHandshake, Link2, LockKeyhole, ShieldCheck, Sparkles, Users } from '@lucide/svelte';
  let { data } = $props();
  let shared = $state(false);
  const registrationUrl = '/login?ny=1&next=/kom-i-gang';

  async function sharePage() {
    const share = { title: 'Bli med på Samvio', text: 'Et norsk, roligere sted å dele med mennesker du velger.', url: location.href };
    if (navigator.share) await navigator.share(share).catch(() => undefined);
    else await navigator.clipboard.writeText(location.href);
    shared = true;
  }
</script>

<svelte:head>
  <title>Bli med fra starten – Samvio</title>
  <meta name="description" content="Sikre brukernavnet ditt og bli med i alphaen til Samvio – en norsk, kronologisk og støyfri sosial plattform." />
  <meta property="og:title" content="Bli med fra starten – Samvio" />
  <meta property="og:description" content="Ekte øyeblikk, kronologisk feed og ingen anbefalingsalgoritme." />
  <meta property="og:url" content="https://samvio.no/bli-med" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://samvio.no/og-samvio.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Bli med fra starten – Samvio" />
  <meta name="twitter:description" content="Ekte øyeblikk, kronologisk feed og ingen anbefalingsalgoritme." />
  <meta name="twitter:image" content="https://samvio.no/og-samvio.png" />
  <link rel="canonical" href="https://samvio.no/bli-med" />
</svelte:head>

<main class="join-page">
  <nav class="join-nav" aria-label="Hovedmeny">
    <a class="brand" href="/"><span>S</span>Samvio</a>
    <div><button onclick={sharePage}><Link2 size={16}/>{shared ? 'Lenke kopiert' : 'Del'}</button><a href="/login">Logg inn</a></div>
  </nav>

  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><Sparkles size={15}/>Du er tidlig ute</p>
      <h1>Sikre plassen din i et <em>roligere sosialt rom.</em></h1>
      <p class="lead">Samvio er norsk, kronologisk og laget for ekte øyeblikk. Ingen anbefalingsalgoritme, ingen endeløs feed og ingen skjult betaling for rekkevidde.</p>
      {#if data.inviter}<p class="invite-note"><HeartHandshake size={18}/><span><strong>@{data.inviter}</strong> inviterte deg til å bli med.</span></p>{/if}
      <div class="actions">
        {#if data.user}
          <a class="primary" href="/kom-i-gang">Gjør profilen klar <ArrowRight size={18}/></a>
        {:else}
          <a class="primary" href={registrationUrl}>Sikre brukernavnet ditt <ArrowRight size={18}/></a>
          {#if data.vippsLoginEnabled}<a class="vipps" href="/auth/vipps?next=/kom-i-gang"><span>V</span>Fortsett med Vipps</a>{/if}
        {/if}
      </div>
      <small>Gratis å prøve i alpha · fra 13 år · du bestemmer hvem du følger</small>
    </div>

    <div class="phone" aria-label="Forhåndsvisning av Samvio på mobil">
      <div class="phone-top"><span class="mini-brand">S</span><strong>Samvio</strong><span class="live-dot">Alpha</span></div>
      <div class="phone-label"><div><strong>Siden sist</strong><small>Nyeste først</small></div><Clock3 size={17}/></div>
      {#if data.publicPosts[0]}
        {@const post = data.publicPosts[0]}
        <article class="moment"><header><span>{post.authorName.slice(0, 1)}</span><div><strong>{post.authorName}</strong><small>@{post.authorUsername}</small></div></header>{#if post.mediaId}<img src={`/media/${post.mediaId}`} alt={post.caption || `Øyeblikk fra ${post.authorName}`}/>{:else}<div class="photo-placeholder"><Sparkles size={35}/></div>{/if}{#if post.caption}<p>{post.caption}</p>{/if}</article>
      {:else}
        <article class="moment"><header><span>S</span><div><strong>Samvio</strong><small>@samvio · akkurat nå</small></div></header><div class="photo-placeholder"><Sparkles size={35}/><p>De første øyeblikkene skapes nå.</p></div></article>
      {/if}
      <div class="caught-up"><ShieldCheck size={19}/><div><strong>Du er ajour</strong><small>Feeden har en slutt.</small></div></div>
    </div>
  </section>

  <section class="reasons" aria-label="Derfor velger folk Samvio">
    <article><span><Clock3 size={22}/></span><h2>Nyeste først</h2><p>Du ser det vennene dine nettopp delte, ikke det en algoritme tror holder deg lengst.</p></article>
    <article><span><Users size={22}/></span><h2>Ta med gjengen</h2><p>Personlige invitasjoner gjør at dere kan starte sammen og slippe en tom feed.</p></article>
    <article><span><LockKeyhole size={22}/></span><h2>Privat som standard</h2><p>Godkjenn følgere selv, eller åpne profilen dersom du ønsker å bli funnet enklere.</p></article>
  </section>

  <section class="how">
    <div><p class="eyebrow"><Check size={15}/>Klar på omtrent ett minutt</p><h2>Fra TikTok til ditt eget rom.</h2><p>Opprett kontoen, velg hvordan profilen skal fungere, finn noen du kjenner og del ditt første øyeblikk.</p></div>
    <ol><li><span>1</span><div><strong>Sikre @brukernavnet</strong><small>Registrer deg med e-post nå, eller Vipps når det er aktivert.</small></div></li><li><span>2</span><div><strong>Gjør profilen til din</strong><small>Profilbilde, en kort bio og et tydelig personvernvalg.</small></div></li><li><span>3</span><div><strong>Inviter noen du faktisk kjenner</strong><small>Del din personlige lenke i TikTok, Snap eller Messenger.</small></div></li></ol>
  </section>

  <section class="bottom-cta"><div><p>Samvio bygges åpent og forsiktig i Norge.</p><h2>Vil du være med fra starten?</h2></div><a class="primary" href={data.user ? '/kom-i-gang' : registrationUrl}>{data.user ? 'Fortsett oppsettet' : 'Opprett gratis konto'} <ArrowRight size={18}/></a></section>
  <footer><a class="brand" href="/"><span>S</span>Samvio</a><nav><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a><a href="/hjelp">Hjelp</a></nav></footer>
</main>

<style>
  :global(body){background:#faf7f1}.join-page{min-height:100vh;color:#18231d;background:radial-gradient(circle at 85% 8%,#dfece4 0,transparent 28rem),#faf7f1}.join-nav{width:min(1120px,calc(100% - 36px));height:76px;margin:auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ded8cc}.brand{display:flex;align-items:center;gap:9px;font:700 27px/1 'Newsreader',serif}.brand>span,.mini-brand{width:30px;height:30px;display:grid;place-items:center;border-radius:10px 5px 10px 5px;background:#315d49;color:#fff;font:800 14px 'DM Sans',sans-serif;transform:rotate(-3deg)}.join-nav>div{display:flex;align-items:center;gap:10px}.join-nav button,.join-nav>div>a{display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid #d7d2c8;border-radius:999px;background:#fff;color:#315d49;font-size:11px;font-weight:800}.hero{width:min(1120px,calc(100% - 36px));margin:auto;padding:68px 0 78px;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.72fr);align-items:center;gap:88px}.eyebrow{display:flex;align-items:center;gap:8px;margin:0 0 17px;color:#a45731;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.hero h1{max-width:690px;margin:0;font:600 clamp(46px,6vw,74px)/.98 'Newsreader',serif;letter-spacing:-2.5px}.hero h1 em{color:#315d49;font-weight:500}.lead{max-width:650px;margin:25px 0 0;color:#5e685f;font-size:16px;line-height:1.65}.invite-note{width:max-content;max-width:100%;display:flex;align-items:center;gap:9px;margin:20px 0 0;padding:10px 13px;border:1px solid #cbdad0;border-radius:999px;background:#edf5f0;color:#315d49;font-size:12px}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:29px}.primary,.vipps{min-height:49px;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:0 19px;border-radius:11px;background:#315d49;color:#fff;font-size:13px;font-weight:800;box-shadow:0 12px 28px #315d4924}.vipps{background:#ff5b24}.vipps span{width:23px;height:23px;display:grid;place-items:center;border-radius:7px;background:#fff;color:#ff5b24}.hero-copy>small{display:block;margin-top:15px;color:#81867f;font-size:10px}.phone{position:relative;padding:16px;border:1px solid #d6d4cc;border-radius:30px;background:#fff;box-shadow:0 28px 70px #26382f20;transform:rotate(1.5deg)}.phone:before{content:'';position:absolute;inset:-22px 30px auto -25px;height:150px;border-radius:30px;background:#e9d6c5;z-index:-1;transform:rotate(-5deg)}.phone-top,.phone-label,.caught-up{display:flex;align-items:center}.phone-top{gap:8px;padding:2px 3px 14px}.mini-brand{width:25px;height:25px;font-size:11px}.phone-top strong{font:700 17px 'Newsreader',serif}.live-dot{margin-left:auto;padding:4px 7px;border-radius:999px;background:#edf3ef;color:#315d49;font-size:8px;font-weight:800;text-transform:uppercase}.phone-label{justify-content:space-between;padding:10px 3px}.phone-label div,.caught-up div{display:grid}.phone-label strong{font-size:12px}.phone-label small,.caught-up small{color:#7c837d;font-size:9px}.moment{overflow:hidden;border:1px solid #dfdcd4;border-radius:17px;background:#fff}.moment header{display:flex;align-items:center;gap:9px;padding:11px}.moment header>span{width:35px;height:35px;display:grid;place-items:center;border-radius:50%;background:#e4eee8;color:#315d49;font-size:11px;font-weight:800}.moment header div{display:grid}.moment header strong{font-size:11px}.moment header small{color:#818681;font-size:9px}.moment>img,.photo-placeholder{width:100%;height:280px;display:grid;place-items:center;object-fit:cover;background:linear-gradient(150deg,#dbe9e0,#e8d4c1);color:#315d49}.photo-placeholder p{margin:0;font:600 20px 'Newsreader',serif}.moment>p{margin:0;padding:12px;font-size:11px;line-height:1.5}.caught-up{gap:9px;padding:15px 4px 2px;color:#315d49}.caught-up strong{font-size:10px}.reasons{width:min(1120px,calc(100% - 36px));margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:30px 0 80px;border-top:1px solid #ded8cc}.reasons article{padding:23px;border:1px solid #e0dcd3;border-radius:17px;background:#fffdf9}.reasons article>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#e7f0eb;color:#315d49}.reasons h2{margin:17px 0 7px;font:600 22px 'Newsreader',serif}.reasons p,.how>div>p{margin:0;color:#6b736c;font-size:12px;line-height:1.6}.how{width:min(960px,calc(100% - 36px));margin:0 auto 80px;padding:45px;display:grid;grid-template-columns:.85fr 1.15fr;gap:60px;border-radius:24px;background:#1f3d30;color:#fff}.how h2{margin:0 0 13px;font:600 37px 'Newsreader',serif}.how>div>p:not(.eyebrow){color:#c5d2ca}.how .eyebrow{color:#e3a37d}.how ol{display:grid;gap:7px;margin:0;padding:0;list-style:none}.how li{display:flex;align-items:center;gap:13px;padding:14px;border-radius:13px;background:#ffffff0d}.how li>span{width:32px;height:32px;display:grid;place-items:center;flex:none;border-radius:10px;background:#fff;color:#315d49;font-weight:900}.how li div{display:grid;gap:3px}.how li strong{font-size:12px}.how li small{color:#b7c5bc;font-size:10px;line-height:1.4}.bottom-cta{width:min(1120px,calc(100% - 36px));margin:0 auto 70px;display:flex;align-items:center;justify-content:space-between;gap:25px;padding:32px 35px;border:1px solid #ddcfbf;border-radius:20px;background:linear-gradient(120deg,#f2dfcc,#edf4ef)}.bottom-cta p{margin:0;color:#95502f;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.bottom-cta h2{margin:5px 0 0;font:600 30px 'Newsreader',serif}footer{width:min(1120px,calc(100% - 36px));margin:auto;padding:25px 0 34px;display:flex;align-items:center;border-top:1px solid #ded8cc}footer .brand{font-size:20px}footer .brand span{width:25px;height:25px;font-size:11px}footer nav{display:flex;gap:18px;margin-left:auto;color:#747b75;font-size:10px}
  @media(max-width:800px){.hero{grid-template-columns:1fr;gap:55px;padding-top:45px}.phone{width:min(430px,100%);margin:auto}.reasons{grid-template-columns:1fr}.how{grid-template-columns:1fr;gap:30px}.bottom-cta{align-items:flex-start;flex-direction:column}}
  @media(max-width:520px){.join-nav{height:64px}.join-nav button{width:42px;height:42px;justify-content:center;padding:0}.join-nav button :global(svg){margin:0}.join-nav button{font-size:0}.join-nav>div>a{display:none}.hero{width:min(100% - 28px,1120px);padding:37px 0 55px}.hero h1{font-size:44px;letter-spacing:-1.7px}.lead{font-size:14px}.actions,.primary,.vipps{width:100%}.phone{padding:12px;border-radius:25px}.moment>img,.photo-placeholder{height:250px}.reasons{width:min(100% - 28px,1120px);padding-bottom:55px}.how{width:100%;margin-bottom:55px;padding:36px 20px;border-radius:0}.how h2{font-size:31px}.bottom-cta{width:calc(100% - 28px);padding:25px}.bottom-cta .primary{width:100%}footer{width:calc(100% - 28px);align-items:flex-start;gap:20px}footer nav{flex-wrap:wrap;justify-content:flex-end}}
</style>
