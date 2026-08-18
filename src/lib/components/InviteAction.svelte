<script lang="ts">
  import { Check, Share2 } from '@lucide/svelte';

  let { username, realName, compact = false } = $props<{
    username: string | null | undefined;
    realName?: string | null;
    compact?: boolean;
  }>();

  let copied = $state(false);

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

  async function shareInvite() {
    if (!username) {
      window.location.href = '/kom-i-gang';
      return;
    }

    const path = `/bli-med?fra=invitasjon&invitasjon=${encodeURIComponent(username)}`;
    const url = `${window.location.origin}${path}`;
    const shareData = {
      title: 'Bli med på Samvio',
      text: `${realName ?? `@${username}`} inviterer deg til Samvio – et roligere sosialt sted med kronologisk feed.`,
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

    await copyText(url);
    copied = true;
    window.setTimeout(() => copied = false, 2200);
  }
</script>

<button class:compact type="button" onclick={shareInvite} aria-label="Inviter venner" title="Inviter venner">
  {#if copied}<Check size={compact ? 22 : 25}/>{:else}<Share2 size={compact ? 22 : 25}/>{/if}
  {#if !compact}<span>{copied ? 'Lenke kopiert' : 'Inviter venner'}</span>{/if}
</button>

<style>
  button{display:flex;align-items:center;gap:16px;width:100%;padding:12px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .16s ease,color .16s ease,transform .16s ease}
  button:hover{background:#f6efe5;color:#8f4d2d;transform:translateX(2px)}
  button.compact{width:auto;min-width:38px;max-width:48px;flex:1;display:grid;place-items:center;padding:0;transform:none}
  button.compact:hover{transform:none}
  @media(max-width:1160px){button:not(.compact) span{display:none}}
</style>
