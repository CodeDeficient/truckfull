import { DurableObject } from 'cloudflare:workers';
import { createBehaviorCounter } from './guardCounter.mjs';
import { GUARD_TIME_LIMIT_MS, handleGuardRequest } from './guardHandler.mjs';

export const BehaviorCounter = createBehaviorCounter(DurableObject);

export default {
  fetch(request, env, ctx) {
    return handleGuardRequest(request, env, GUARD_TIME_LIMIT_MS, (task) => ctx.waitUntil(task));
  },
};
