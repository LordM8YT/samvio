<script lang="ts">
  import { BadgeDollarSign, Flag, Heart, MessageCircle, UserRound } from '@lucide/svelte';
  let { post } = $props<{ post: { id: string; caption: string | null; createdAt: Date; authorName: string; authorUsername: string; authorRole?: 'user' | 'moderator' | 'admin'; mediaId: string | null; liked?: boolean; isCommercial?: boolean; sponsorName?: string | null } }>();
  let liked = $state(false);
  let busy = $state(false);
  let reportOpen = $state(false);
  let reportReason = $state('spam');
  let reportStatus = $state('');
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
  async function reportPost() {
    reportStatus = 'Sender …';
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetType: 'post', targetId: post.id, reason: reportReason }) });
    const result = await response.json().catch(() => ({}));
    reportStatus = response.ok ? 'Rapport mottatt' : result.error || 'Kunne ikke rapportere';
    if (response.ok) window.setTimeout(() => reportOpen = false, 1200);
  }
</script>

<article class="post-card">
  <header><a class="post-avatar" href={`/bruker/${post.authorUsername}`} aria-label={`Se profilen til ${post.authorName}`}><UserRound size={19}/></a><div><a href={`/bruker/${post.authorUsername}`}><strong>{post.authorName}</strong>{#if post.authorRole === 'admin'}<span class="staff-badge">Admin</span>{:else if post.authorRole === 'moderator'}<span class="staff-badge mod">Moderator</span>{/if}<small>@{post.authorUsername}</small></a></div>{#if post.isCommercial}<span class="commercial-badge"><BadgeDollarSign size={13}/>Reklame · {post.sponsorName}</span>{/if}<time datetime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</time></header>
  {#if post.mediaId}<a href={`/innlegg/${post.id}`}><img src={`/media/${post.mediaId}`} alt={post.caption || `Bilde fra ${post.authorName}`}/></a>{/if}
  <div class="post-actions"><button class:active={liked} disabled={busy} aria-label={liked ? 'Fjern reaksjon' : 'Lik øyeblikket'} aria-pressed={liked} onclick={toggleLike}><Heart size={22} fill={liked ? 'currentColor' : 'none'}/></button><a href={`/innlegg/${post.id}`} aria-label="Se kommentarer"><MessageCircle size={22}/><span>Kommenter</span></a><button class="report-trigger" aria-label="Rapporter innlegg" onclick={() => { reportOpen = !reportOpen; reportStatus = ''; }}><Flag size={19}/></button></div>
  {#if reportOpen}<div class="report-box"><label>Hvorfor rapporterer du?<select bind:value={reportReason}><option value="spam">Spam eller reklamebrudd</option><option value="harassment">Trakassering</option><option value="sexual">Seksuelt innhold</option><option value="violence">Vold eller trusler</option><option value="privacy">Personvern</option><option value="other">Annet</option></select></label><button onclick={reportPost}>Send rapport</button>{#if reportStatus}<span>{reportStatus}</span>{/if}</div>{/if}
  {#if post.caption}<p><strong>{post.authorUsername}</strong> {post.caption}</p>{/if}
</article>

<style>
  .post-actions{align-items:center}.post-actions button{color:#303030}.post-actions button.active{color:#315d49}.post-actions button:disabled{cursor:wait;opacity:.6}.post-actions a{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700}.post-card>a>img{display:block;width:100%;max-height:680px;object-fit:cover;background:#f2f2f2}
  .staff-badge{display:inline-flex;margin-left:7px;padding:2px 6px;border-radius:999px;background:#315d49;color:#fff;font-size:8px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.staff-badge.mod{background:#b76538}
  .commercial-badge{display:flex;align-items:center;gap:4px;margin-left:auto;padding:5px 8px;border-radius:999px;background:#f7eadc;color:#8d4b29;font-size:9px;font-weight:800}.post-card header time{margin-left:8px}.report-trigger{margin-left:auto}.report-box{display:flex;align-items:end;gap:8px;margin:2px 13px 9px;padding:10px;border:1px solid #e2ddd4;border-radius:9px;background:#faf8f4}.report-box label{display:grid;gap:4px;color:#666;font-size:9px;font-weight:700}.report-box select{padding:7px;border:1px solid #d5d1c9;border-radius:7px;background:#fff;font-size:10px}.report-box button{padding:8px 10px;border:0;border-radius:7px;background:#315d49;color:#fff;font-size:10px;font-weight:800}.report-box span{color:#315d49;font-size:10px}@media(max-width:600px){.commercial-badge{order:4;width:max-content;margin:3px 0 0 46px}.post-card header{flex-wrap:wrap}.report-box{align-items:stretch;flex-direction:column}}
</style>
