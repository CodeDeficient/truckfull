import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Accept Invite Race Condition', () => {
  const routePath = path.join(process.cwd(), 'app/api/auth/accept-invite/route.ts');
  const content = fs.readFileSync(routePath, 'utf-8');

  it('should use claim_truck_atomic RPC for truck claiming', () => {
    const usesRpc = /\.rpc\(['"]claim_truck_atomic['"]/.test(content);

    expect(usesRpc).toBe(true);
  });

  it('should NOT use UPDATE for claiming truck', () => {
    const updateClaimMatch = /from\(['"]food_trucks['"]\)[\s\S]*?\.update\(/.test(content);

    expect(updateClaimMatch).toBe(false);
  });

  it('should pass truck_id, user_id, and contact_email to RPC', () => {
    const rpcCall = content.match(/\.rpc\(['"]claim_truck_atomic['"],\s*\{[\s\S]*?\}\)/);

    expect(rpcCall).toBeTruthy();

    if (rpcCall) {
      const params = rpcCall[0];
      const hasTruckId = /p_truck_id:\s*truckId/.test(params);
      const hasUserId = /p_user_id:\s*user\.id/.test(params);
      const hasContactEmail = /p_contact_email:\s*invite\.email/.test(params);

      expect(hasTruckId && hasUserId && hasContactEmail).toBe(true);
    }
  });

  it('should check RPC result for success flag', () => {
    const hasResultCheck = /result\?\.success|data\?\.success/.test(content);

    expect(hasResultCheck).toBe(true);
  });

  it('should return 409 if truck already claimed', () => {
    const has409Response =
      /status:\s*409/.test(content) && /already claimed|Truck already claimed/i.test(content);

    expect(has409Response).toBe(true);
  });
});
