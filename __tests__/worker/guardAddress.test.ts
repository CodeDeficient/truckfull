/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { compileRelayFeed, parseAddress } from '../../worker/guardAddress.mjs';
import { relayFeedText } from './support/relayFeed';

describe('parseAddress', () => {
  it('reads IPv4 and IPv6 addresses as numbers', () => {
    expect(parseAddress('1.2.3.4')).toEqual({ bits: 32, value: 0x01020304n });
    expect(parseAddress('2001:db8::1')).toEqual({
      bits: 128,
      value: 0x20010db8000000000000000000000001n,
    });
  });

  it('treats an IPv4-mapped IPv6 address as IPv4 unless told not to', () => {
    expect(parseAddress('::ffff:1.2.3.4')).toEqual({ bits: 32, value: 0x01020304n });
    expect(parseAddress('::ffff:1.2.3.4', false).bits).toBe(128);
  });

  it.each(['', '1.2.3', '1.2.3.256', 'fe80::1%eth0', '1::2::3', '1:2:3:4:5:6:7', 'zz::1'])(
    'rejects %p',
    (address) => {
      expect(() => parseAddress(address)).toThrow();
    },
  );
});

describe('compileRelayFeed', () => {
  it('merges adjacent ranges per address family and counts the source lines', () => {
    const feed = compileRelayFeed(relayFeedText());
    expect(feed.counts).toEqual({ 32: 10_000, 128: 10_000 });
    expect(feed.ranges[32]).toEqual([[0xac100000n, 0xac100000n + 9_999n]]);
    expect(feed.ranges[128]).toHaveLength(1);
  });

  it('refuses a feed that is too small to be the real one', () => {
    expect(() => compileRelayFeed('172.16.0.0/32\n')).toThrow('unexpected relay feed size');
  });

  it('refuses a feed with a malformed range', () => {
    expect(() => compileRelayFeed(`not-a-cidr\n${relayFeedText()}`)).toThrow('invalid relay CIDR');
  });
});
