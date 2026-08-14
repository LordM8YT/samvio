<script lang="ts">
  import { CalendarDays, ImagePlus, ShieldCheck, UserRound } from '@lucide/svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>{data.profile.realName} – Samvio</title></svelte:head>

<main class="profile-page">
  <div class="profile-shell">
    <header class="profile-header">
      <span class="avatar"><UserRound size={38}/></span>
      <div><h1>{data.profile.realName} {#if data.profile.role === 'admin'}<span class="role-badge">Admin</span>{:else if data.profile.role === 'moderator'}<span class="role-badge mod">Moderator</span>{/if}</h1><p>@{data.profile.username}</p></div>
      {#if !data.isOwnProfile}
        <form method="POST" action={data.followStatus === 'accepted' ? '?/unfollow' : '?/follow'}><button>{data.followStatus === 'accepted' ? 'Følger' : data.followStatus === 'pending' ? 'Forespurt' : 'Følg'}</button></form>
      {/if}
    </header>
    <section class="profile-overview" aria-label="Profiloversikt">
      <div><strong>{data.stats.posts}</strong><span>øyeblikk</span></div>
      <div><strong>{data.stats.followers}</strong><span>følgere</span></div>
      <div><strong>{data.stats.following}</strong><span>følger</span></div>
      {#if data.isOwnProfile}<a href="/?opprett=1"><ImagePlus size={18}/> Del et øyeblikk</a>{/if}
    </section>
    <nav class="profile-tabs" aria-label="Profilinnhold"><a class="active" href="#oyeblikk">Øyeblikk</a><a href="#om-profil">Om profilen</a></nav>
    {#if data.profile.bio}<section id="om-profil" class="about-profile"><strong>Om {data.profile.realName}</strong><p>{data.profile.bio}</p></section>{/if}
    {#if form?.followError}<p class="error" role="alert">{form.followError}</p>{/if}
    <div id="oyeblikk" class="timeline-title"><CalendarDays size={20}/><div><strong>Øyeblikk</strong><span>Nyeste først, uten algoritmisk rangering.</span></div></div>
    {#if data.canSeePosts && data.moments.length}
      <section class="profile-posts">{#each data.moments as post}<PostCard {post}/>{/each}</section>
    {:else if !data.canSeePosts}
      <section class="empty"><ShieldCheck size={28}/><h2>Følg for å se øyeblikk</h2><p>Denne tidslinjen deles med personer profilen har en akseptert relasjon til.</p></section>
    {:else}
      <section class="empty"><CalendarDays size={28}/><h2>Ingen øyeblikk ennå</h2><p>Når noe deles, vises det her i kronologisk rekkefølge.</p></section>
    {/if}
  </div>
</main>

<style>
  .profile-page{min-height:100vh;padding:38px 18px 80px;background:#f6f4ef}.profile-shell{width:min(720px,100%);margin:auto}.back{display:inline-flex;align-items:center;gap:7px;color:#315d49;font-size:13px;font-weight:700}.profile-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;margin:35px 0 28px;padding:22px;border:1px solid #ddd9d0;border-radius:16px;background:#fff}.avatar{width:70px;height:70px;display:grid;place-items:center;border-radius:22px 8px 22px 8px;background:#315d49;color:#fff}.profile-header h1{margin:0;font:600 32px 'Newsreader',serif}.profile-header p{margin:3px 0;color:#747874}.bio{margin-top:10px;font-size:13px;line-height:1.5}.profile-header button{padding:9px 15px;border:1px solid #315d49;border-radius:9px;background:#315d49;color:#fff;font-weight:700}.timeline-title{display:flex;align-items:center;gap:10px;margin:0 0 14px}.timeline-title div{display:grid}.timeline-title span{color:#777;font-size:11px}.timeline{display:grid;gap:18px;border-left:2px solid #cfd9d3;padding-left:22px}.timeline article{position:relative;overflow:hidden;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.timeline article:before{content:'';position:absolute;left:-29px;top:20px;width:10px;height:10px;border:3px solid #f6f4ef;border-radius:50%;background:#315d49}.timeline time{display:block;padding:12px 14px;color:#6c716d;font-size:11px;font-weight:700}.timeline img{display:block;width:100%;max-height:620px;object-fit:cover}.timeline p{margin:0;padding:14px;font-size:13px;line-height:1.55}.empty{min-height:260px;display:grid;place-items:center;align-content:center;gap:7px;padding:25px;text-align:center;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.empty h2{margin:5px 0 0;font-size:20px}.empty p{max-width:430px;margin:0;color:#777;font-size:13px}.error{padding:10px;border-radius:8px;background:#fff0ed;color:#9b3c2d}@media(max-width:600px){.profile-header{grid-template-columns:auto 1fr}.profile-header form{grid-column:1/-1}.profile-header button{width:100%}.profile-header h1{font-size:27px}}
  .role-badge{display:inline-flex;vertical-align:middle;padding:4px 8px;border-radius:999px;background:#315d49;color:#fff;font:800 9px system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase}.role-badge.mod{background:#b76538}.profile-posts{display:grid;gap:18px}.profile-overview{display:flex;align-items:center;gap:8px;margin:-12px 0 22px;padding:15px 17px;border:1px solid #ddd7cc;border-radius:13px;background:linear-gradient(120deg,#fff,#f1f6f3)}.profile-overview>div{min-width:82px;display:grid;text-align:center}.profile-overview strong{font:600 22px 'Newsreader',serif}.profile-overview span{color:#737873;font-size:10px}.profile-overview a{margin-left:auto;display:flex;align-items:center;gap:7px;padding:10px 13px;border-radius:9px;background:#315d49;color:#fff;font-size:12px;font-weight:700}.profile-tabs{display:flex;gap:22px;margin-bottom:18px;border-bottom:1px solid #ddd7cc}.profile-tabs a{padding:11px 2px;color:#747874;font-size:12px;font-weight:700}.profile-tabs a.active{margin-bottom:-1px;border-bottom:2px solid #315d49;color:#315d49}.about-profile{margin-bottom:18px;padding:17px;border-radius:12px;background:#f8f2e8}.about-profile p{margin:5px 0 0;color:#555;font-size:13px;line-height:1.55}@media(max-width:600px){.profile-overview{display:grid;grid-template-columns:repeat(3,1fr)}.profile-overview a{grid-column:1/-1;width:100%;justify-content:center;margin:4px 0 0}}
</style>
