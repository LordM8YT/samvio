<script lang="ts">
  import { ArrowLeft, Flag, MessageCircle, UserRound } from '@lucide/svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  let { data, form } = $props();
  let reportStatus = $state<Record<string, string>>({});
  async function reportComment(commentId: string) {
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetType: 'comment', targetId: commentId, reason: 'harassment' }) });
    const result = await response.json().catch(() => ({}));
    reportStatus[commentId] = response.ok ? 'Sendt til moderering' : result.error || 'Kunne ikke rapportere';
  }
</script>

<svelte:head>
  <title>{data.post.authorName} på Samvio</title>
  <meta name="description" content={data.post.caption || `Se et offentlig øyeblikk fra ${data.post.authorName} på Samvio.`}/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content={`${data.post.authorName} på Samvio`}/>
  <meta property="og:description" content={data.post.caption || `Se et offentlig øyeblikk fra ${data.post.authorName} på Samvio.`}/>
  <meta property="og:url" content={`https://samvio.no/innlegg/${data.post.id}`}/>
  <meta property="og:image" content={data.post.mediaId ? `https://samvio.no/media/${data.post.mediaId}` : 'https://samvio.no/og-samvio.png'}/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content={`${data.post.authorName} på Samvio`}/>
  <meta name="twitter:description" content={data.post.caption || `Se et offentlig øyeblikk fra ${data.post.authorName} på Samvio.`}/>
  <meta name="twitter:image" content={data.post.mediaId ? `https://samvio.no/media/${data.post.mediaId}` : 'https://samvio.no/og-samvio.png'}/>
</svelte:head>

<main class="moment-page">
  <div class="moment-shell">
    <a class="back" href="/"><ArrowLeft size={18}/> Tilbake til feeden</a>
    <PostCard post={data.post}/>
    <section id="kommentarer" class="comments">
      <header><MessageCircle size={20}/><div><h1>Kommentarer</h1><p>Nyeste kommentarer først.</p></div></header>
      <form method="POST" action="?/comment">
        <label for="comment">Skriv en kommentar</label>
        <textarea id="comment" name="comment" maxlength="1000" rows="3" required placeholder="Skriv noe vennlig …"></textarea>
        {#if form?.commentError}<p class="error" role="alert">{form.commentError}</p>{/if}
        <button>Publiser kommentar</button>
      </form>
      {#if data.comments.length}
        <div class="comment-list">
          {#each data.comments as comment}
            <article><span><UserRound size={17}/></span><div><header><a href={`/bruker/${comment.authorUsername}`}><strong>{comment.authorName}</strong> <small>@{comment.authorUsername}</small></a><time datetime={comment.createdAt.toISOString()}>{comment.createdAt.toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></header><p>{comment.body}</p><div class="comment-tools"><button aria-label="Rapporter kommentar" onclick={() => reportComment(comment.id)}><Flag size={13}/> Rapporter</button>{#if reportStatus[comment.id]}<small>{reportStatus[comment.id]}</small>{/if}</div></div></article>
          {/each}
        </div>
      {:else}
        <div class="empty">Ingen kommentarer ennå. Du kan være den første.</div>
      {/if}
    </section>
  </div>
</main>

<style>
  .moment-page{min-height:100vh;padding:34px 16px 80px;background:#f6f4ef}.moment-shell{width:min(680px,100%);margin:auto}.back{display:inline-flex;align-items:center;gap:7px;margin-bottom:24px;color:#315d49;font-size:13px;font-weight:700}.comments{margin-top:18px;padding:22px;border:1px solid #ddd9d0;border-radius:14px;background:#fff}.comments>header{display:flex;align-items:center;gap:10px}.comments h1{margin:0;font-size:20px}.comments header p{margin:2px 0 0;color:#777;font-size:11px}.comments>form{display:grid;gap:9px;margin:20px 0}.comments label{font-size:12px;font-weight:700}.comments textarea{resize:vertical;padding:11px;border:1px solid #d5d2cb;border-radius:9px;font:inherit}.comments form button{width:max-content;padding:10px 14px;border:0;border-radius:8px;background:#315d49;color:#fff;font-weight:700}.error{margin:0;color:#9b3c2d;font-size:12px}.comment-list{display:grid}.comment-list article{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:15px 0;border-top:1px solid #eee}.comment-list article>span{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#edf1ee}.comment-list article header{display:flex;justify-content:space-between;gap:12px}.comment-list small,.comment-list time{color:#777;font-size:10px}.comment-list p{margin:5px 0 0;font-size:13px;line-height:1.5;white-space:pre-wrap}.empty{padding:25px 0 8px;border-top:1px solid #eee;color:#777;text-align:center;font-size:12px}@media(max-width:600px){.moment-page{padding:20px 10px calc(70px + env(safe-area-inset-bottom))}.comments{padding:17px}.comment-list article header{display:grid;gap:2px}}
  .comment-tools{display:flex;align-items:center;gap:8px;margin-top:7px}.comment-tools button{display:flex;align-items:center;gap:4px;padding:0;border:0;background:transparent;color:#777;font-size:10px}.comment-tools button:hover{color:#9b3c2d}.comment-tools small{color:#315d49}
</style>
