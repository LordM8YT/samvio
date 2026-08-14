<script lang="ts">
  import { Heart, MessageCircle, UserRound } from '@lucide/svelte';
  let { post } = $props<{ post: { id: string; caption: string | null; createdAt: Date; authorName: string; authorUsername: string; mediaId: string | null; liked?: boolean } }>();
  let liked = $state(false);
  let busy = $state(false);
  $effect(() => { liked = !!post.liked; });
  async function toggleLike() {
    if (busy) return;
    busy = true;
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      if (response.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (response.ok) liked = !!(await response.json()).liked;
    } finally { busy = false; }
  }
</script>

<article class="post-card">
  <header><a class="post-avatar" href={`/bruker/${post.authorUsername}`} aria-label={`Se profilen til ${post.authorName}`}><UserRound size={19}/></a><div><a href={`/bruker/${post.authorUsername}`}><strong>{post.authorName}</strong><small>@{post.authorUsername}</small></a></div><time datetime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</time></header>
  {#if post.mediaId}<a href={`/innlegg/${post.id}`}><img src={`/media/${post.mediaId}`} alt={post.caption || `Bilde fra ${post.authorName}`}/></a>{/if}
  <div class="post-actions"><button class:active={liked} disabled={busy} aria-label={liked ? 'Fjern reaksjon' : 'Lik øyeblikket'} aria-pressed={liked} onclick={toggleLike}><Heart size={22} fill={liked ? 'currentColor' : 'none'}/></button><a href={`/innlegg/${post.id}`} aria-label="Se kommentarer"><MessageCircle size={22}/><span>Kommenter</span></a></div>
  {#if post.caption}<p><strong>{post.authorUsername}</strong> {post.caption}</p>{/if}
</article>

<style>
  .post-actions{align-items:center}.post-actions button{color:#303030}.post-actions button.active{color:#315d49}.post-actions button:disabled{cursor:wait;opacity:.6}.post-actions a{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700}.post-card>a>img{display:block;width:100%;max-height:680px;object-fit:cover;background:#f2f2f2}
</style>
