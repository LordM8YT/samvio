<script lang="ts">
  import { ArrowLeft, ShieldCheck } from '@lucide/svelte';
  import { untrack } from 'svelte';
  let { data, form } = $props();
  let mode = $state<'login' | 'register'>(untrack(() => data.registerMode ? 'register' : 'login'));
  $effect(() => { if (form?.mode === 'login' || form?.mode === 'register') mode = form.mode; });
</script>
<svelte:head><title>{mode === 'login' ? 'Logg inn' : 'Opprett konto'} – Samvio</title></svelte:head>
<main class="auth-page">
  <a class="back" href="/"><ArrowLeft size={19}/> Tilbake</a>
  <section class="auth-card">
    <a class="auth-logo" href="/">Samvio</a>
    <h1>{mode === 'login' ? 'Velkommen tilbake' : 'Opprett din profil'}</h1>
    <p>{mode === 'login' ? 'Logg inn på Samvio alpha.' : 'Alpha er for inviterte testbrukere fra 13 år.'}</p>
    {#if mode === 'login'}{#if data.vippsLoginEnabled}<a class="vipps-login" href={`/auth/vipps?next=${encodeURIComponent(data.next)}`}><span>V</span>Logg inn med Vipps</a>{:else}<div class="vipps-login disabled" aria-disabled="true"><span>V</span>Vipps Logg inn · kommer snart</div>{/if}<div class="divider"><span>eller bruk e-post</span></div>{/if}
    <div class="tabs"><button class:active={mode === 'login'} onclick={() => mode = 'login'}>Logg inn</button><button class:active={mode === 'register'} onclick={() => mode = 'register'}>Ny konto</button></div>
    {#if data.vippsError}<div class="form-error" role="alert">{data.vippsError}</div>{/if}{#if form?.message}<div class="form-error" role="alert">{form.message}</div>{/if}
    <form method="POST" action={mode === 'login' ? '?/login' : '?/register'} autocomplete="on">
      {#if mode === 'register'}
        <label for="real-name">Fullt navn<input id="real-name" name="realName" autocomplete="name" required minlength="2" maxlength="120"/></label>
        <label for="new-username">Brukernavn<input id="new-username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required pattern="[a-z0-9_]+" minlength="3" maxlength="30" placeholder="kun små bokstaver"/></label>
        <label for="birth-date">Fødselsdato<input id="birth-date" name="birthDate" type="date" autocomplete="bday" required/></label>
      {/if}
      <label for="email">E-post<input id="email" name="email" type="email" inputmode="email" autocomplete={mode === 'login' ? 'username' : 'email'} autocapitalize="none" spellcheck="false" required/></label>
      <label for="password">Passord<input id="password" name="password" type="password" autocomplete={mode === 'login' ? 'current-password' : 'new-password'} required minlength="8"/></label>
      <button class="submit">{mode === 'login' ? 'Logg inn' : 'Opprett konto'}</button>
    </form>
    <div class="dev-notice"><span class="notice-icon"><ShieldCheck size={18}/></span><span><strong>Alpha-konto</strong> Kontoen er ikke BankID-verifisert. Ikke del sensitive personopplysninger.</span></div>
  </section>
</main>

<style>
  .auth-page{min-height:100vh;display:grid;place-items:center;padding:60px 20px;background:#fafafa}.back{position:fixed;left:28px;top:25px;display:flex;align-items:center;gap:7px;font-size:13px}.auth-card{width:min(430px,100%);padding:40px;background:#fff;border:1px solid #dbdbdb;border-radius:10px}.auth-logo{display:block;margin-bottom:27px;text-align:center;font:600 34px 'Newsreader',serif}.auth-card h1{margin:0;text-align:center;font-size:23px}.auth-card>p{margin:8px auto 25px;color:#737373;text-align:center;font-size:13px;line-height:1.5}.tabs{display:grid;grid-template-columns:1fr 1fr;margin-bottom:22px;border-bottom:1px solid #ddd}.tabs button{padding:11px;border:0;border-bottom:2px solid transparent;background:transparent;color:#777}.tabs button.active{border-color:#315d49;color:#171717;font-weight:700}form{display:grid;gap:14px}label{display:grid;gap:6px;font-size:12px;font-weight:600}input{width:100%;height:43px;padding:0 12px;border:1px solid #d6d6d6;border-radius:7px;background:#fafafa;font:14px 'DM Sans',sans-serif}input:focus{outline:2px solid #315d4933;border-color:#315d49}.submit{height:44px;margin-top:5px;border:0;border-radius:8px;background:#315d49;color:#fff;font-weight:700}.form-error{margin-bottom:15px;padding:10px;border-radius:7px;background:#fff0ed;color:#9b3c2d;font-size:12px}.dev-notice{display:flex;gap:9px;margin-top:24px;padding-top:19px;border-top:1px solid #eee;color:#727a75;font-size:10px;line-height:1.5}.notice-icon{flex:none;color:#315d49}.dev-notice strong{display:block;color:#315d49}
  .vipps-login{height:48px;display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:16px;border-radius:9px;background:#ff5b24;color:#fff;font-size:14px;font-weight:800;box-shadow:0 8px 20px #ff5b2426}.vipps-login span{width:23px;height:23px;display:grid;place-items:center;border-radius:7px;background:#fff;color:#ff5b24;font-weight:900}.divider{display:flex;align-items:center;gap:10px;margin:0 0 16px;color:#929292;font-size:9px;text-transform:uppercase;letter-spacing:.07em}.divider::before,.divider::after{content:'';height:1px;flex:1;background:#e7e7e7}
  .vipps-login.disabled{cursor:not-allowed;filter:saturate(.45);opacity:.72;box-shadow:none}
</style>
