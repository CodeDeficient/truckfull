import { describe, expect, it, jest } from '@jest/globals';
import { compensateFailedFoundingBind } from '@/lib/stripe/foundingCheckoutCleanup';

describe('compensateFailedFoundingBind', () => {
  it('releases the reservation when Stripe confirms expiration', async () => {
    const expireSession = jest.fn().mockResolvedValue(true);
    const releaseReservation = jest.fn().mockResolvedValue(undefined);

    const outcome = await compensateFailedFoundingBind({
      reservationId: 'res-1',
      checkoutSessionId: 'cs-1',
      expireCheckoutSession: expireSession,
      releaseReservation,
    });

    expect(outcome).toBe('checkout_expired');
    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(expireSession).toHaveBeenCalledWith('cs-1');
    expect(releaseReservation).toHaveBeenCalledTimes(1);
    expect(releaseReservation).toHaveBeenCalledWith('res-1');
  });

  it('retains the reservation when Stripe expiration is unconfirmed', async () => {
    const expireSession = jest.fn().mockResolvedValue(false);
    const releaseReservation = jest.fn().mockResolvedValue(undefined);

    const outcome = await compensateFailedFoundingBind({
      reservationId: 'res-1',
      checkoutSessionId: 'cs-1',
      expireCheckoutSession: expireSession,
      releaseReservation,
    });

    expect(outcome).toBe('checkout_expiration_unconfirmed');
    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(releaseReservation).not.toHaveBeenCalled();
  });

  it('propagates an error when Stripe expiration throws', async () => {
    const expireSession = jest.fn().mockRejectedValue(new Error('stripe down'));
    const releaseReservation = jest.fn().mockResolvedValue(undefined);

    await expect(
      compensateFailedFoundingBind({
        reservationId: 'res-1',
        checkoutSessionId: 'cs-1',
        expireCheckoutSession: expireSession,
        releaseReservation,
      }),
    ).rejects.toThrow('stripe down');

    expect(releaseReservation).not.toHaveBeenCalled();
  });

  it('propagates an error when reservation release throws after confirmed expiration', async () => {
    const expireSession = jest.fn().mockResolvedValue(true);
    const releaseReservation = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(
      compensateFailedFoundingBind({
        reservationId: 'res-1',
        checkoutSessionId: 'cs-1',
        expireCheckoutSession: expireSession,
        releaseReservation,
      }),
    ).rejects.toThrow('db down');
  });
});
