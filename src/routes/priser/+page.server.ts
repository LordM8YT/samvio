import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { plans, type PlanCode } from '$lib/plans';
import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import { createAgreement, getAgreement } from '$lib/server/vipps/client';
import { getVippsConfig, isVippsEnabled } from '$lib/server/vipps/config';

const purchasable = plans.filter((plan) => ['person', 'family'].includes(plan.code));

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
        await db.update(subscriptions).set({ status: 'active', currentPeriodStart: new Date() })
          .where(eq(subscriptions.id, subscription.id));
      }
    }
  }
  return { vippsEnabled: isVippsEnabled(), loggedIn: Boolean(locals.user), paymentStatus };
};

export const actions: Actions = {
  subscribe: async ({ request, locals }) => {
    if (!locals.user) redirect(303, `/login?next=${encodeURIComponent('/priser')}`);
    if (!isVippsEnabled()) return fail(503, { paymentError: 'Vipps åpnes snart.' });
    const form = await request.formData();
    const planCode = String(form.get('plan')) as PlanCode;
    const plan = purchasable.find((candidate) => candidate.code === planCode);
    if (!plan || !plan.monthlyPriceNok) return fail(400, { paymentError: 'Ugyldig abonnement.' });

    const id = randomUUID();
    await db.insert(subscriptions).values({
      id, userId: locals.user.id, planCode: plan.code as 'person' | 'family',
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
