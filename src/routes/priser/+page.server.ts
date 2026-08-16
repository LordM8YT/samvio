import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { plans, type PlanCode } from '$lib/plans';
import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import { getUserEntitlements, getUserStorageUsage } from '$lib/server/subscriptions';
import { createAgreement, getAgreement } from '$lib/server/vipps/client';
import { getVippsConfig, isVippsEnabled } from '$lib/server/vipps/config';

const purchasable = plans.filter((plan) => plan.purchaseReady && plan.monthlyPriceNok);

function oneMonthFrom(date: Date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const subscriptionId = url.searchParams.get('subscription');
  let paymentStatus: string | null = null;
  if (locals.user && subscriptionId && isVippsEnabled()) {
    const [subscription] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, locals.user.id))).limit(1);
    if (subscription?.providerSubscriptionId) {
      const agreement = await getAgreement(subscription.providerSubscriptionId);
      paymentStatus = agreement.status ?? 'PENDING';
      if (agreement.status === 'ACTIVE' && subscription.status !== 'active') {
        // Agreements are created with a DIRECT_CAPTURE initial charge. ACTIVE therefore means
        // the first payment succeeded, and only then may paid product rights be granted.
        const currentPeriodStart = new Date();
        await db.update(subscriptions).set({
          status: 'active',
          currentPeriodStart,
          currentPeriodEnd: oneMonthFrom(currentPeriodStart)
        }).where(eq(subscriptions.id, subscription.id));
      } else if ((agreement.status === 'STOPPED' || agreement.status === 'EXPIRED') && subscription.status === 'trialing') {
        await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, subscription.id));
      }
    }
  }

  let currentPlan = 'free';
  let storageUsedBytes = 0;
  let storageLimitBytes = 1024 * 1024 * 1024;
  if (locals.user) {
    const [entitlements, usage] = await Promise.all([
      getUserEntitlements(locals.user.id),
      getUserStorageUsage(locals.user.id)
    ]);
    currentPlan = entitlements.planCode;
    storageUsedBytes = usage;
    storageLimitBytes = entitlements.storageLimitBytes;
  }

  return { vippsEnabled: isVippsEnabled(), loggedIn: Boolean(locals.user), paymentStatus, currentPlan, storageUsedBytes, storageLimitBytes };
};

export const actions: Actions = {
  subscribe: async ({ request, locals }) => {
    if (!locals.user) redirect(303, `/login?next=${encodeURIComponent('/priser')}`);
    if (!isVippsEnabled()) return fail(503, { paymentError: 'Vipps åpnes snart.' });

    const existing = await getUserEntitlements(locals.user.id);
    if (existing.planCode !== 'free') return fail(409, { paymentError: 'Du har allerede et aktivt betalt abonnement.' });

    const form = await request.formData();
    const planCode = String(form.get('plan')) as PlanCode;
    const plan = purchasable.find((candidate) => candidate.code === planCode);
    if (!plan || !plan.monthlyPriceNok) return fail(400, { paymentError: 'Dette abonnementet kan ikke bestilles ennå.' });

    const id = randomUUID();
    await db.insert(subscriptions).values({
      id, userId: locals.user.id, planCode: plan.code as 'person',
      status: 'trialing', priceOre: plan.monthlyPriceNok * 100
    });
    try {
      const origin = getVippsConfig().publicUrl;
      const agreement = await createAgreement({
        amountOre: plan.monthlyPriceNok * 100,
        productName: `Samvio ${plan.name}`,
        redirectUrl: `${origin}/priser?subscription=${id}`,
        agreementUrl: `${origin}/priser`,
        idempotencyKey: id
      });
      if (!agreement.agreementId || !agreement.vippsConfirmationUrl) throw error(502, 'Vipps returnerte en ufullstendig avtale.');
      await db.update(subscriptions).set({ providerSubscriptionId: agreement.agreementId }).where(eq(subscriptions.id, id));
      redirect(303, agreement.vippsConfirmationUrl);
    } catch (cause) {
      await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, id));
      if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
      console.error('Vipps agreement creation failed', cause);
      return fail(502, { paymentError: 'Kunne ikke kontakte Vipps. Prøv igjen senere.' });
    }
  }
};
