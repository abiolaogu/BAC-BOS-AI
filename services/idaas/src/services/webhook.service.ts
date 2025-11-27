/**
 * NEXUS IDaaS - Webhook Delivery Service
 * Event-driven notifications to external systems
 */

import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Webhook, WebhookEvent, IDaaSError, ErrorCode } from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';

interface CreateWebhookRequest {
  organizationId: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
}

interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: any;
  organizationId: string;
}

interface WebhookDeliveryAttempt {
  webhookId: string;
  payload: WebhookPayload;
  attempt: number;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

export class WebhookService {
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  /**
   * Create webhook
   */
  async create(data: CreateWebhookRequest, createdBy?: string): Promise<Webhook> {
    // Generate secret if not provided
    const secret = data.secret || this.generateSecret();

    const webhook = await db.queryOne<Webhook>(
      `INSERT INTO webhooks (
        organization_id, url, events, secret, enabled
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *`,
      [
        data.organizationId,
        data.url,
        data.events,
        secret,
      ]
    );

    if (!webhook) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create webhook',
        500
      );
    }

    logger.info('Webhook created', {
      webhookId: webhook.id,
      organizationId: data.organizationId,
      url: data.url,
      events: data.events,
    });

    return webhook;
  }

  /**
   * Update webhook
   */
  async update(
    webhookId: string,
    data: Partial<CreateWebhookRequest>
  ): Promise<Webhook> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }

    if (data.events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      values.push(data.events);
    }

    if (data.secret !== undefined) {
      updates.push(`secret = $${paramIndex++}`);
      values.push(data.secret);
    }

    if (updates.length === 0) {
      const existing = await this.getById(webhookId);
      if (!existing) {
        throw new IDaaSError(
          ErrorCode.INVALID_REQUEST,
          'Webhook not found',
          404
        );
      }
      return existing;
    }

    values.push(webhookId);

    const webhook = await db.queryOne<Webhook>(
      `UPDATE webhooks
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!webhook) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Webhook not found',
        404
      );
    }

    logger.info('Webhook updated', { webhookId });

    return webhook;
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string): Promise<void> {
    const result = await db.query('DELETE FROM webhooks WHERE id = $1', [
      webhookId,
    ]);

    if (result.rowCount === 0) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Webhook not found',
        404
      );
    }

    logger.info('Webhook deleted', { webhookId });
  }

  /**
   * Enable/disable webhook
   */
  async setEnabled(webhookId: string, enabled: boolean): Promise<void> {
    await db.query('UPDATE webhooks SET enabled = $1 WHERE id = $2', [
      enabled,
      webhookId,
    ]);

    logger.info('Webhook status changed', { webhookId, enabled });
  }

  /**
   * Get webhook by ID
   */
  async getById(webhookId: string): Promise<Webhook | null> {
    return await db.queryOne<Webhook>(
      'SELECT * FROM webhooks WHERE id = $1',
      [webhookId]
    );
  }

  /**
   * List webhooks for organization
   */
  async listByOrganization(organizationId: string): Promise<Webhook[]> {
    return await db.queryMany<Webhook>(
      `SELECT * FROM webhooks
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(
    event: WebhookEvent,
    organizationId: string,
    data: any
  ): Promise<void> {
    // Get all webhooks for this organization that listen to this event
    const webhooks = await db.queryMany<Webhook>(
      `SELECT * FROM webhooks
       WHERE organization_id = $1
         AND enabled = true
         AND $2 = ANY(events)`,
      [organizationId, event]
    );

    if (webhooks.length === 0) {
      return;
    }

    // Create payload
    const payload: WebhookPayload = {
      id: uuidv4(),
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    // Deliver to all webhooks asynchronously
    for (const webhook of webhooks) {
      // Don't await - fire and forget with retries
      this.deliverWebhook(webhook, payload).catch((error) => {
        logger.error('Webhook delivery failed', {
          webhookId: webhook.id,
          event,
          error: error.message,
        });
      });
    }
  }

  /**
   * Deliver webhook with retries
   */
  private async deliverWebhook(
    webhook: Webhook,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret);

      // Send webhook
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NEXUS-IDaaS-Webhook/1.0',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Delivery-ID': payload.id,
        },
        timeout: 10000, // 10 seconds
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const responseTime = Date.now() - startTime;

      // Update webhook stats
      await db.query(
        `UPDATE webhooks
         SET last_triggered_at = NOW(),
             failure_count = 0
         WHERE id = $1`,
        [webhook.id]
      );

      logger.info('Webhook delivered successfully', {
        webhookId: webhook.id,
        event: payload.event,
        statusCode: response.status,
        responseTime,
        attempt,
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.warn('Webhook delivery failed', {
        webhookId: webhook.id,
        event: payload.event,
        attempt,
        error: error.message,
        statusCode: error.response?.status,
        responseTime,
      });

      // Retry if not max attempts
      if (attempt < this.maxRetries) {
        const delay = this.retryDelays[attempt - 1];

        logger.info('Retrying webhook delivery', {
          webhookId: webhook.id,
          attempt: attempt + 1,
          delay,
        });

        await this.sleep(delay);
        return this.deliverWebhook(webhook, payload, attempt + 1);
      }

      // Max retries reached - update failure count
      await db.query(
        `UPDATE webhooks
         SET failure_count = failure_count + 1,
             last_triggered_at = NOW()
         WHERE id = $1`,
        [webhook.id]
      );

      // Disable webhook if too many failures
      const updatedWebhook = await this.getById(webhook.id);
      if (updatedWebhook && updatedWebhook.failureCount >= 10) {
        await this.setEnabled(webhook.id, false);
        logger.warn('Webhook disabled due to too many failures', {
          webhookId: webhook.id,
          failureCount: updatedWebhook.failureCount,
        });
      }

      throw error;
    }
  }

  /**
   * Test webhook
   */
  async test(webhookId: string): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
  }> {
    const webhook = await this.getById(webhookId);
    if (!webhook) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Webhook not found',
        404
      );
    }

    const payload: WebhookPayload = {
      id: uuidv4(),
      event: WebhookEvent.USER_CREATED,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
      organizationId: webhook.organizationId,
    };

    const startTime = Date.now();

    try {
      const signature = this.generateSignature(payload, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NEXUS-IDaaS-Webhook/1.0',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Test': 'true',
        },
        timeout: 10000,
        validateStatus: () => true, // Accept any status for test
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Get webhook delivery logs (from cache)
   */
  async getDeliveryLogs(webhookId: string, limit: number = 100): Promise<any[]> {
    const logs = await cache.get<any[]>(`webhook:logs:${webhookId}`) || [];
    return logs.slice(0, limit);
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: WebhookPayload,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: string): Promise<string> {
    const secret = this.generateSecret();

    await db.query('UPDATE webhooks SET secret = $1 WHERE id = $2', [
      secret,
      webhookId,
    ]);

    logger.info('Webhook secret regenerated', { webhookId });

    return secret;
  }

  /**
   * Get webhook statistics
   */
  async getStats(webhookId: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastTriggered?: Date;
    failureCount: number;
    enabled: boolean;
  }> {
    const webhook = await this.getById(webhookId);
    if (!webhook) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Webhook not found',
        404
      );
    }

    // These would typically come from a separate webhook_deliveries table
    // For now, return basic stats from the webhook record
    return {
      totalDeliveries: 0, // TODO: Implement delivery tracking
      successfulDeliveries: 0,
      failedDeliveries: webhook.failureCount,
      lastTriggered: webhook.lastTriggeredAt || undefined,
      failureCount: webhook.failureCount,
      enabled: webhook.enabled,
    };
  }
}
