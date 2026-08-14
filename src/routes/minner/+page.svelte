<script lang="ts">
  import { CalendarHeart } from '@lucide/svelte';
  let { data } = $props();
</script>

<svelte:head><title>Minner – Samvio</title></svelte:head>

<main class="memories-page"><div class="memories-shell">
  <header><span><CalendarHeart size={28}/></span><div><p>På denne dagen</p><h1>{data.today.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}</h1></div></header>
  {#if data.memories.length}
    <section class="memory-list">{#each data.memories as memory}<article><time datetime={memory.createdAt.toISOString()}>{memory.createdAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</time>{#if memory.mediaId}<img src={`/media/${memory.mediaId}`} alt={memory.caption || 'Et tidligere øyeblikk'}/>{/if}{#if memory.caption}<p>{memory.caption}</p>{/if}</article>{/each}</section>
  {:else}
    <section class="empty"><CalendarHeart size={35}/><h2>Ingen minner i dag ennå</h2><p>Når du har brukt Samvio en stund, dukker dine egne øyeblikk fra denne datoen opp her.</p></section>
  {/if}
</div></main>

<style>
  .memories-page{min-height:100vh;padding:42px 18px 80px;background:#f6f4ef}.memories-shell{width:min(720px,100%);margin:auto}.back{display:inline-flex;align-items:center;gap:7px;color:#315d49;font-size:13px;font-weight:700}.memories-shell>header{display:flex;align-items:center;gap:14px;margin:38px 0 24px}.memories-shell>header>span{width:58px;height:58px;display:grid;place-items:center;border-radius:20px 8px 20px 8px;background:#b76538;color:#fff}.memories-shell header p{margin:0;color:#9a502c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.memories-shell h1{margin:2px 0 0;font:600 34px 'Newsreader',serif}.memory-list{display:grid;gap:18px}.memory-list article{overflow:hidden;border:1px solid #ddd9d0;border-radius:16px;background:#fff}.memory-list time{display:block;padding:13px 15px;color:#6e726f;font-size:12px;font-weight:700}.memory-list img{display:block;width:100%;max-height:650px;object-fit:cover}.memory-list article>p{margin:0;padding:15px;font-size:13px;line-height:1.55}.empty{min-height:340px;display:grid;place-items:center;align-content:center;gap:8px;padding:24px;text-align:center;border:1px solid #ddd9d0;border-radius:16px;background:#fff}.empty h2{margin:5px 0 0;font-size:21px}.empty p{max-width:430px;margin:0;color:#777;font-size:13px;line-height:1.55}
</style>
