import {
  clearPendingBan,
  initializeSchema,
  pendingBanBatch,
  planAfterAlarm,
  recordBehavior,
} from './guardBehavior.mjs';
import { RelayRegistry } from './guardRelay.mjs';
import { forgetTraffic, observeTraffic } from './guardTraffic.mjs';

export function banRegistryName(ipKey) {
  return `bans:${ipKey.slice(0, 2)}`;
}

export function createBehaviorCounter(Base, fetchImpl = (...args) => fetch(...args)) {
  return class BehaviorCounter extends Base {
    constructor(ctx, env) {
      super(ctx, env);
      this.ctx = ctx;
      this.env = env;
      this.relay = new RelayRegistry({
        storage: ctx.storage,
        fetchImpl,
        waitUntil: (task) => ctx.waitUntil(task),
        initializeBase: () => this.initialize(),
      });
      ctx.blockConcurrencyWhile(async () => {
        this.initialize();
      });
    }

    initialize() {
      if (this.initialized) return;
      initializeSchema(this.ctx.storage.sql);
      this.initialized = true;
    }

    isPermanentlyBanned(ip) {
      this.initialize();
      return (
        this.ctx.storage.sql.exec('SELECT ip FROM banned_ips WHERE ip = ?', ip).toArray().length > 0
      );
    }

    permanentlyBan(ip) {
      this.initialize();
      this.ctx.storage.sql.exec('INSERT OR IGNORE INTO banned_ips(ip) VALUES (?)', ip);
    }

    removePermanentBan(ip) {
      this.initialize();
      this.ctx.storage.sql.exec('DELETE FROM banned_ips WHERE ip = ?', ip);
    }

    relayStatus(ip, force = false) {
      return this.relay.status(ip, force);
    }

    observeTraffic(ip, isPrefetch, now) {
      this.initialize();
      return observeTraffic(this.ctx.storage.sql, ip, isPrefetch, now);
    }

    forgetTraffic(ip, isPrefetch, at, withTotals) {
      this.initialize();
      return forgetTraffic(this.ctx.storage.sql, ip, isPrefetch, at, withTotals);
    }

    async scheduleAlarmBy(at) {
      const previous = await this.ctx.storage.getAlarm();
      if (previous === null || previous > at) await this.ctx.storage.setAlarm(at);
    }

    async observe(mode, ip, path, now) {
      this.initialize();
      const { block, reason, cleanupAt } = recordBehavior(
        this.ctx.storage.sql,
        mode,
        ip,
        path,
        now,
      );
      await this.scheduleAlarmBy(cleanupAt);
      return { block, reason };
    }

    async persistPendingBans() {
      const sql = this.ctx.storage.sql;
      const pending = pendingBanBatch(sql);
      const results = await Promise.allSettled(
        pending.map((ip) => this.env.COUNTER.getByName(banRegistryName(ip)).permanentlyBan(ip)),
      );
      let failed = 0;
      for (const [i, result] of results.entries()) {
        if (result.status === 'fulfilled') clearPendingBan(sql, pending[i]);
        else failed += 1;
      }
      if (failed) {
        console.error(
          JSON.stringify({
            event: 'detector_error',
            message: 'permanent-ban persistence failed',
            count: failed,
          }),
        );
      }
      return failed;
    }

    async alarm() {
      const now = Date.now();
      this.initialize();
      const failed = await this.persistPendingBans();
      const plan = planAfterAlarm(this.ctx.storage.sql, now, failed, this.relay.initialized);
      if (plan.deleteAll) {
        await this.ctx.storage.deleteAll();
        this.initialized = false;
        this.relay.initialized = false;
      }
      if (plan.nextAlarm !== null) await this.ctx.storage.setAlarm(plan.nextAlarm);
    }
  };
}
