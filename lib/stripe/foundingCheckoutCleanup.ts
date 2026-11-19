export type FoundingBindCleanupOutcome = 'checkout_expired' | 'checkout_expiration_unconfirmed';

interface CompensateFailedFoundingBindParams {
  readonly reservationId: string;
  readonly checkoutSessionId: string;
  readonly expireCheckoutSession: (sessionId: string) => Promise<boolean>;
  readonly releaseReservation: (reservationId: string) => Promise<void>;
}

export async function compensateFailedFoundingBind({
  reservationId,
  checkoutSessionId,
  expireCheckoutSession,
  releaseReservation,
}: CompensateFailedFoundingBindParams): Promise<FoundingBindCleanupOutcome> {
  const expired = await expireCheckoutSession(checkoutSessionId);
  if (!expired) {
    return 'checkout_expiration_unconfirmed';
  }
  await releaseReservation(reservationId);
  return 'checkout_expired';
}
