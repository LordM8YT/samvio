<script lang="ts">
  import { CalendarDays, LockKeyhole } from '@lucide/svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  let { data } = $props();
  const periods = [{ id: 'week', label: 'Denne uka' }, { id: 'month', label: 'Denne måneden' }, { id: 'year', label: 'Siste 12 måneder' }, { id: 'older', label: 'Eldre' }];
</script>

<svelte:head><title>Tidligere øyeblikk – Samvio</title></svelte:head>

<main class="history-page">
  <div class="history-shell">
    <header><span><CalendarDays size={25}/></span><div><h1>Tidligere øyeblikk</h1><p>Et rolig arkiv over det menneskene dine har delt.</p></div></header>
    <nav aria-label="Velg tidsperiode">{#each periods as period}<a class:active={period.id === data.period} href={`/historikk?periode=${period.id}`}>{period.label}{#if period.id === 'older' && data.planCode === 'free'} <LockKeyhole size={12}/>{/if}</a>{/each}</nav>
    {#if data.archiveLocked}
      <section class="archive-locked"><LockKeyhole size={34}/><h2>Hele arkivet er med Person</h2><p>Gratis har tilgang til de siste 12 månedene. Person gir tilgang til hele den private historikken din.</p><a href="/priser">Se Person – 29 kr/mnd</a></section>
    {:else if data.posts.length}
      <section class="history-list">{#each data.posts as post}<PostCard {post}/>{/each}</section>
      {#if data.nextCursor}<a class="more-history" href={`/historikk?periode=${data.period}&foer=${encodeURIComponent(data.nextCursor)}`}>Vis eldre innlegg</a>{/if}
    {:else}
      <section class="history-empty"><CalendarDays size={35}/><h2>Ingen øyeblikk i denne perioden</h2><p>Velg en annen periode, eller kom tilbake når menneskene dine har delt mer.</p></section>
    {/if}
  </div>
</main>

<style>
  .history-page{min-height:100vh;padding:45px 18px 80px;background:#f6f4ef}.history-shell{width:min(720px,100%);margin:auto}.back-link{display:inline-flex;align-items:center;gap:7px;color:#315d49;font-size:13px;font-weight:700}.history-shell>header{display:flex;align-items:center;gap:15px;margin:38px 0 25px}.history-shell>header>span{width:54px;height:54px;display:grid;place-items:center;border-radius:16px 7px 16px 7px;background:#315d49;color:#fff}.history-shell h1{margin:0;font:600 34px 'Newsreader',serif}.history-shell header p{margin:4px 0 0;color:#6d716e;font-size:13px}.history-shell>nav{display:flex;gap:8px;margin-bottom:20px;overflow:auto}.history-shell>nav a{flex:none;padding:9px 13px;border:1px solid #d5d2ca;border-radius:999px;background:#fff;font-size:12px;display:inline-flex;align-items:center;gap:5px}.history-shell>nav a.active{border-color:#315d49;background:#315d49;color:#fff}.history-list{display:grid;gap:18px}.history-list article{overflow:hidden;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.history-meta{display:flex;align-items:center;gap:10px;padding:14px}.history-meta>span{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#edf1ee}.history-meta div{display:grid}.history-meta small{color:#777;font-size:10px}.history-list img{display:block;width:100%;max-height:680px;object-fit:cover}.history-list article>p{margin:0;padding:14px;font-size:13px;line-height:1.55}.more-history{display:block;width:max-content;margin:25px auto 0;padding:11px 16px;border-radius:9px;background:#315d49;color:#fff;font-size:12px;font-weight:700}.history-empty,.archive-locked{min-height:330px;display:grid;place-items:center;align-content:center;gap:9px;padding:28px;text-align:center;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.history-empty h2,.archive-locked h2{margin:4px 0 0;font-size:20px}.history-empty p,.archive-locked p{max-width:440px;margin:0;color:#777;font-size:13px;line-height:1.5}.archive-locked svg{color:#315d49}.archive-locked a{margin-top:10px;padding:10px 14px;border-radius:9px;background:#315d49;color:#fff;font-size:12px;font-weight:700}@media(max-width:600px){.history-page{padding-top:25px}.history-shell h1{font-size:29px}}
</style>
