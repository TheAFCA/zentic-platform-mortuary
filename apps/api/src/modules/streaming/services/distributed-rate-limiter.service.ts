import { Injectable, Inject, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.module';
import type Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
}

@Injectable()
export class DistributedRateLimiterService {
  private readonly logger = new Logger(DistributedRateLimiterService.name);

  private readonly limits: Record<string, RateLimitConfig> = {
    access_code: { windowMs: 60_000, maxAttempts: 5, keyPrefix: 'rl:access' },
    message: { windowMs: 60_000, maxAttempts: 10, keyPrefix: 'rl:msg' },
    reaction: { windowMs: 60_000, maxAttempts: 30, keyPrefix: 'rl:react' },
    admin_action: { windowMs: 60_000, maxAttempts: 60, keyPrefix: 'rl:admin' },
  };

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Verifica si una acción está dentro del límite de tasa.
   * @param action - Tipo de acción (access_code, message, reaction, admin_action)
   * @param key - Clave compuesta (ej: "ip:{ip}:event:{eventId}:session:{sessionId}")
   * @returns true si está permitido, false si excede el límite
   */
  async checkRateLimit(action: string, key: string): Promise<boolean> {
    const config = this.limits[action];
    if (!config) return true;

    const redisKey = `${config.keyPrefix}:${key}`;

    try {
      const current = await this.redis.incr(redisKey);

      if (current === 1) {
        await this.redis.pexpire(redisKey, config.windowMs);
      }

      return current <= config.maxAttempts;
    } catch (error) {
      this.logger.warn(`Error checking rate limit: ${error}`);
      return true;
    }
  }

  /**
   * Obtiene el tiempo restante de cooldown para una clave.
   */
  async getRemainingTtl(action: string, key: string): Promise<number> {
    const config = this.limits[action];
    if (!config) return 0;

    const redisKey = `${config.keyPrefix}:${key}`;
    try {
      return Math.max(0, await this.redis.pttl(redisKey));
    } catch {
      return 0;
    }
  }

  /**
   * Construye una clave compuesta para rate limiting (MOD-03).
   * Combina IP, evento y sesión.
   */
  buildKey(params: {
    ip?: string;
    eventId?: string;
    sessionId?: string;
  }): string {
    const parts: string[] = [];
    if (params.ip) parts.push(`ip:${params.ip}`);
    if (params.eventId) parts.push(`event:${params.eventId}`);
    if (params.sessionId) parts.push(`session:${params.sessionId}`);
    return parts.join(':');
  }

  /**
   * Resetea el contador de rate limiting para una clave.
   */
  async resetRateLimit(action: string, key: string): Promise<void> {
    const config = this.limits[action];
    if (!config) return;

    const redisKey = `${config.keyPrefix}:${key}`;
    try {
      await this.redis.del(redisKey);
    } catch (error) {
      this.logger.warn(`Error resetting rate limit: ${error}`);
    }
  }
}
