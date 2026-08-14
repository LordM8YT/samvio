<script lang="ts">
  import { ArrowLeft, CalendarDays, ShieldCheck, UserRound } from '@lucide/svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>{data.profile.realName} – Samvio</title></svelte:head>

<main class="profile-page">
  <div class="profile-shell">
    <a class="back" href="/sok"><ArrowLeft size={17}/> Tilbake til søk</a>
    <header class="profile-header">
      <span class="avatar"><UserRound size={38}/></span>
      <div><h1>{data.profile.realName}</h1><p>@{data.profile.username}</p>{#if data.profile.bio}<div class="bio">{data.profile.bio}</div>{/if}</div>
      {#if !data.isOwnProfile}
        <form method="POST" action={data.followStatus === 'accepted' ? '?/unfollow' : '?/follow'}><button>{data.followStatus === 'accepted' ? 'Følger' : data.followStatus === 'pending' ? 'Forespurt' : 'Følg'}</button></form>
      {/if}
    </header>
    {#if form?.followError}<p class="error" role="alert">{form.followError}</p>{/if}
    <div class="timeline-title"><CalendarDays size={20}/><div><strong>Øyeblikk</strong><span>Nyeste først, gruppert som en tidslinje.</span></div></div>
    {#if data.canSeePosts && data.moments.length}
      <section class="timeline">{#each data.moments as moment}<article><time datetime={moment.createdAt.toISOString()}>{moment.createdAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</time>{#if moment.mediaId}<img src={`/media/${moment.mediaId}`} alt={moment.caption || `Øyeblikk fra ${data.profile.realName}`}/>{/if}{#if moment.caption}<p>{moment.caption}</p>{/if}</article>{/each}</section>
    {:else if !data.canSeePosts}
      <section class="empty"><ShieldCheck size={28}/><h2>Følg for å se øyeblikk</h2><p>Denne tidslinjen deles med personer profilen har en akseptert relasjon til.</p></section>
    {:else}
      <section class="empty"><CalendarDays size={28}/><h2>Ingen øyeblikk ennå</h2><p>Når noe deles, vises det her i kronologisk rekkefølge.</p></section>
    {/if}
  </div>
</main>

<style>
  .profile-page{min-height:100vh;padding:38px 18px 80px;background:#f6f4ef}.profile-shell{width:min(720px,100%);margin:auto}.back{display:inline-flex;align-items:center;gap:7px;color:#315d49;font-size:13px;font-weight:700}.profile-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;margin:35px 0 28px;padding:22px;border:1px solid #ddd9d0;border-radius:16px;background:#fff}.avatar{width:70px;height:70px;display:grid;place-items:center;border-radius:22px 8px 22px 8px;background:#315d49;color:#fff}.profile-header h1{margin:0;font:600 32px 'Newsreader',serif}.profile-header p{margin:3px 0;color:#747874}.bio{margin-top:10px;font-size:13px;line-height:1.5}.profile-header button{padding:9px 15px;border:1px solid #315d49;border-radius:9px;background:#315d49;color:#fff;font-weight:700}.timeline-title{display:flex;align-items:center;gap:10px;margin:0 0 14px}.timeline-title div{display:grid}.timeline-title span{color:#777;font-size:11px}.timeline{display:grid;gap:18px;border-left:2px solid #cfd9d3;padding-left:22px}.timeline article{position:relative;overflow:hidden;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.timeline article:before{content:'';position:absolute;left:-29px;top:20px;width:10px;height:10px;border:3px solid #f6f4ef;border-radius:50%;background:#315d49}.timeline time{display:block;padding:12px 14px;color:#6c716d;font-size:11px;font-weight:700}.timeline img{display:block;width:100%;max-height:620px;object-fit:cover}.timeline p{margin:0;padding:14px;font-size:13px;line-height:1.55}.empty{min-height:260px;display:grid;place-items:center;align-content:center;gap:7px;padding:25px;text-align:center;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.empty h2{margin:5px 0 0;font-size:20px}.empty p{max-width:430px;margin:0;color:#777;font-size:13px}.error{padding:10px;border-radius:8px;background:#fff0ed;color:#9b3c2d}@media(max-width:600px){.profile-header{grid-template-columns:auto 1fr}.profile-header form{grid-column:1/-1}.profile-header button{width:100%}.profile-header h1{font-size:27px}}
</style>
