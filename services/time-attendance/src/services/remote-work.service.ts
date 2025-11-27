/**
 * NEXUS Time & Attendance - Remote Work Service
 * Productivity tracking and activity monitoring for remote employees
 */

import { v4 as uuidv4 } from 'uuid';
import { startOfDay, endOfDay, differenceInSeconds } from 'date-fns';
import {
  ActivityRecord,
  ActivityCategory,
  AgentHeartbeat,
  AgentActivity,
  ProductivityStats,
  ProductivityReportQuery,
  TimeAttendanceError,
  ErrorCode,
} from '../types';
import { db } from '../utils/database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

interface ApplicationCategoryRule {
  pattern: string; // Regex pattern for app name
  category: ActivityCategory;
  productivityScore: number;
}

export class RemoteWorkService {
  private readonly screenshotPath = process.env.UPLOAD_PATH || './uploads/screenshots';
  private readonly screenshotRetentionDays = parseInt(
    process.env.SCREENSHOT_RETENTION_DAYS || '30'
  );

  /**
   * Default application categorization rules
   */
  private readonly defaultCategorizationRules: ApplicationCategoryRule[] = [
    // Productive - Development
    { pattern: 'vscode|visual studio|intellij|pycharm|eclipse|sublime', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },
    { pattern: 'git|github|gitlab|bitbucket', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },
    { pattern: 'docker|kubernetes|terraform', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },

    // Productive - Design
    { pattern: 'figma|sketch|adobe|photoshop|illustrator', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },

    // Productive - Office
    { pattern: 'excel|word|powerpoint|google docs|google sheets', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },

    // Productive - Database
    { pattern: 'pgadmin|mysql workbench|mongodb compass|dbeaver', category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 },

    // Communication
    { pattern: 'slack|teams|zoom|meet|skype|discord|telegram', category: ActivityCategory.COMMUNICATION, productivityScore: 0.8 },
    { pattern: 'outlook|gmail|thunderbird|mail', category: ActivityCategory.COMMUNICATION, productivityScore: 0.8 },

    // Neutral - Browsers (depends on content)
    { pattern: 'chrome|firefox|safari|edge|brave', category: ActivityCategory.NEUTRAL, productivityScore: 0.5 },

    // Neutral - System
    { pattern: 'explorer|finder|terminal|cmd|powershell', category: ActivityCategory.NEUTRAL, productivityScore: 0.5 },

    // Unproductive - Entertainment
    { pattern: 'youtube|netflix|spotify|twitch|gaming', category: ActivityCategory.UNPRODUCTIVE, productivityScore: 0.0 },
    { pattern: 'facebook|instagram|twitter|tiktok|reddit', category: ActivityCategory.UNPRODUCTIVE, productivityScore: 0.0 },
  ];

  /**
   * Handle agent heartbeat
   */
  async handleHeartbeat(heartbeat: AgentHeartbeat): Promise<void> {
    const cacheKey = `agent:heartbeat:${heartbeat.userId}`;

    await cache.set(cacheKey, heartbeat, 600); // 10 minutes TTL

    // Update user's last activity
    await db.query(
      `INSERT INTO user_activity_status (user_id, last_heartbeat, agent_version, is_active, os_info)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         last_heartbeat = EXCLUDED.last_heartbeat,
         agent_version = EXCLUDED.agent_version,
         is_active = EXCLUDED.is_active,
         os_info = EXCLUDED.os_info`,
      [
        heartbeat.userId,
        heartbeat.timestamp,
        heartbeat.agentVersion,
        heartbeat.isActive,
        JSON.stringify(heartbeat.osInfo),
      ]
    );

    logger.debug('Agent heartbeat received', { userId: heartbeat.userId });
  }

  /**
   * Process agent activity data
   */
  async processAgentActivity(activity: AgentActivity): Promise<void> {
    const { userId, activities, screenshot } = activity;

    // Get organization's categorization rules
    const rules = await this.getCategorizationRules(userId);

    // Process each activity
    for (const act of activities) {
      const { category, productivityScore } = this.categorizeActivity(
        act.applicationName,
        act.url,
        rules
      );

      // Store activity record
      await db.query(
        `INSERT INTO activity_records (
          id, user_id, activity_timestamp, application_name,
          window_title, url, category, productivity_score,
          active_time_seconds, idle_time_seconds,
          keystrokes, mouse_clicks, is_personal_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uuidv4(),
          userId,
          act.timestamp,
          act.applicationName,
          act.windowTitle,
          act.url,
          category,
          productivityScore,
          act.activeTimeSeconds,
          act.idleTimeSeconds,
          act.keystrokes,
          act.mouseClicks,
          false, // is_personal_time
        ]
      );
    }

    // Process screenshot if provided
    if (screenshot) {
      await this.storeScreenshot(userId, screenshot);
    }

    // Update daily summary
    await this.updateDailySummary(userId, new Date());

    logger.info('Agent activity processed', {
      userId,
      activityCount: activities.length,
      hasScreenshot: !!screenshot,
    });
  }

  /**
   * Categorize activity based on application name and URL
   */
  private categorizeActivity(
    applicationName: string,
    url: string | undefined,
    rules: ApplicationCategoryRule[]
  ): { category: ActivityCategory; productivityScore: number } {
    const appName = applicationName.toLowerCase();

    // Try URL categorization first if available
    if (url) {
      const urlLower = url.toLowerCase();

      // Productivity URLs
      if (
        urlLower.includes('github.com') ||
        urlLower.includes('stackoverflow.com') ||
        urlLower.includes('docs.') ||
        urlLower.includes('documentation')
      ) {
        return { category: ActivityCategory.PRODUCTIVE, productivityScore: 1.0 };
      }

      // Communication URLs
      if (
        urlLower.includes('slack.com') ||
        urlLower.includes('teams.microsoft.com') ||
        urlLower.includes('mail.google.com')
      ) {
        return { category: ActivityCategory.COMMUNICATION, productivityScore: 0.8 };
      }

      // Unproductive URLs
      if (
        urlLower.includes('youtube.com') ||
        urlLower.includes('facebook.com') ||
        urlLower.includes('twitter.com') ||
        urlLower.includes('netflix.com')
      ) {
        return { category: ActivityCategory.UNPRODUCTIVE, productivityScore: 0.0 };
      }
    }

    // Apply rules in order
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(appName)) {
        return {
          category: rule.category,
          productivityScore: rule.productivityScore,
        };
      }
    }

    // Default to neutral
    return { category: ActivityCategory.NEUTRAL, productivityScore: 0.5 };
  }

  /**
   * Get categorization rules for user's organization
   */
  private async getCategorizationRules(
    userId: string
  ): Promise<ApplicationCategoryRule[]> {
    // Try to get custom rules from organization settings
    const customRules = await db.queryMany<ApplicationCategoryRule>(
      `SELECT acr.pattern, acr.category, acr.productivity_score as "productivityScore"
       FROM application_category_rules acr
       JOIN organization_memberships om ON acr.organization_id = om.organization_id
       WHERE om.user_id = $1
       ORDER BY acr.priority`,
      [userId]
    );

    if (customRules.length > 0) {
      // Merge custom rules with defaults (custom rules take precedence)
      return [...customRules, ...this.defaultCategorizationRules];
    }

    return this.defaultCategorizationRules;
  }

  /**
   * Store screenshot
   */
  private async storeScreenshot(
    userId: string,
    screenshot: { data: Buffer; timestamp: Date; isBlurred: boolean }
  ): Promise<string> {
    // Create directory structure
    const today = new Date();
    const dir = path.join(
      this.screenshotPath,
      userId,
      today.getFullYear().toString(),
      (today.getMonth() + 1).toString().padStart(2, '0')
    );

    await fs.mkdir(dir, { recursive: true });

    // Generate filename
    const timestamp = screenshot.timestamp.getTime();
    const filename = `${timestamp}.jpg`;
    const filepath = path.join(dir, filename);

    // Process image (resize, compress, blur if needed)
    let imageBuffer = screenshot.data;

    if (screenshot.isBlurred) {
      imageBuffer = await sharp(screenshot.data)
        .resize(1280, 720, { fit: 'inside' })
        .blur(10)
        .jpeg({ quality: 60 })
        .toBuffer();
    } else {
      imageBuffer = await sharp(screenshot.data)
        .resize(1280, 720, { fit: 'inside' })
        .jpeg({ quality: 60 })
        .toBuffer();
    }

    // Save file
    await fs.writeFile(filepath, imageBuffer);

    // Store reference in database
    await db.query(
      `UPDATE activity_records
       SET screenshot_path = $1
       WHERE user_id = $2 AND activity_timestamp = $3`,
      [filepath, userId, screenshot.timestamp]
    );

    logger.info('Screenshot stored', {
      userId,
      timestamp: screenshot.timestamp,
      isBlurred: screenshot.isBlurred,
      size: imageBuffer.length,
    });

    return filepath;
  }

  /**
   * Update daily productivity summary
   */
  private async updateDailySummary(userId: string, date: Date): Promise<void> {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Calculate daily stats from activity records
    const stats = await db.queryOne<{
      totalActiveSeconds: number;
      totalIdleSeconds: number;
      productiveSeconds: number;
      communicationSeconds: number;
      neutralSeconds: number;
      unproductiveSeconds: number;
      avgProductivityScore: number;
      totalKeystrokes: number;
      totalMouseClicks: number;
    }>(
      `SELECT
         COALESCE(SUM(active_time_seconds), 0)::int as "totalActiveSeconds",
         COALESCE(SUM(idle_time_seconds), 0)::int as "totalIdleSeconds",
         COALESCE(SUM(CASE WHEN category = 'productive' THEN active_time_seconds ELSE 0 END), 0)::int as "productiveSeconds",
         COALESCE(SUM(CASE WHEN category = 'communication' THEN active_time_seconds ELSE 0 END), 0)::int as "communicationSeconds",
         COALESCE(SUM(CASE WHEN category = 'neutral' THEN active_time_seconds ELSE 0 END), 0)::int as "neutralSeconds",
         COALESCE(SUM(CASE WHEN category = 'unproductive' THEN active_time_seconds ELSE 0 END), 0)::int as "unproductiveSeconds",
         COALESCE(AVG(productivity_score), 0) as "avgProductivityScore",
         COALESCE(SUM(keystrokes), 0)::int as "totalKeystrokes",
         COALESCE(SUM(mouse_clicks), 0)::int as "totalMouseClicks"
       FROM activity_records
       WHERE user_id = $1
         AND activity_timestamp BETWEEN $2 AND $3
         AND is_personal_time = false`,
      [userId, startDate, endDate]
    );

    if (!stats) return;

    // Upsert daily summary
    await db.query(
      `INSERT INTO daily_productivity_summary (
        user_id, summary_date,
        total_active_seconds, total_idle_seconds,
        productive_seconds, communication_seconds,
        neutral_seconds, unproductive_seconds,
        avg_productivity_score, total_keystrokes, total_mouse_clicks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, summary_date)
      DO UPDATE SET
        total_active_seconds = EXCLUDED.total_active_seconds,
        total_idle_seconds = EXCLUDED.total_idle_seconds,
        productive_seconds = EXCLUDED.productive_seconds,
        communication_seconds = EXCLUDED.communication_seconds,
        neutral_seconds = EXCLUDED.neutral_seconds,
        unproductive_seconds = EXCLUDED.unproductive_seconds,
        avg_productivity_score = EXCLUDED.avg_productivity_score,
        total_keystrokes = EXCLUDED.total_keystrokes,
        total_mouse_clicks = EXCLUDED.total_mouse_clicks`,
      [
        userId,
        startDate,
        stats.totalActiveSeconds,
        stats.totalIdleSeconds,
        stats.productiveSeconds,
        stats.communicationSeconds,
        stats.neutralSeconds,
        stats.unproductiveSeconds,
        stats.avgProductivityScore,
        stats.totalKeystrokes,
        stats.totalMouseClicks,
      ]
    );
  }

  /**
   * Get productivity statistics
   */
  async getProductivityStats(query: ProductivityReportQuery): Promise<ProductivityStats> {
    const { userId, startDate, endDate, groupBy = 'day' } = query;

    // Get summary records
    const summaries = await db.queryMany<any>(
      `SELECT *
       FROM daily_productivity_summary
       WHERE user_id = $1
         AND summary_date BETWEEN $2 AND $3
       ORDER BY summary_date`,
      [userId, startOfDay(startDate), startOfDay(endDate)]
    );

    if (summaries.length === 0) {
      return {
        avgProductivityScore: 0,
        totalActiveHours: 0,
        totalIdleHours: 0,
        productiveHours: 0,
        communicationHours: 0,
        neutralHours: 0,
        unproductiveHours: 0,
        topApplications: [],
        productivityTrend: [],
      };
    }

    // Calculate aggregate stats
    let totalActiveSeconds = 0;
    let totalIdleSeconds = 0;
    let productiveSeconds = 0;
    let communicationSeconds = 0;
    let neutralSeconds = 0;
    let unproductiveSeconds = 0;
    let totalScore = 0;

    const trend: Array<{ date: string; score: number }> = [];

    for (const summary of summaries) {
      totalActiveSeconds += summary.total_active_seconds || 0;
      totalIdleSeconds += summary.total_idle_seconds || 0;
      productiveSeconds += summary.productive_seconds || 0;
      communicationSeconds += summary.communication_seconds || 0;
      neutralSeconds += summary.neutral_seconds || 0;
      unproductiveSeconds += summary.unproductive_seconds || 0;
      totalScore += summary.avg_productivity_score || 0;

      trend.push({
        date: summary.summary_date.toISOString().split('T')[0],
        score: Math.round(summary.avg_productivity_score * 100),
      });
    }

    // Get top applications
    const topApps = await db.queryMany<{
      name: string;
      seconds: number;
      score: number;
    }>(
      `SELECT
         application_name as name,
         SUM(active_time_seconds)::int as seconds,
         AVG(productivity_score) as score
       FROM activity_records
       WHERE user_id = $1
         AND activity_timestamp BETWEEN $2 AND $3
         AND is_personal_time = false
       GROUP BY application_name
       ORDER BY seconds DESC
       LIMIT 10`,
      [userId, startDate, endDate]
    );

    const stats: ProductivityStats = {
      avgProductivityScore: Math.round((totalScore / summaries.length) * 100),
      totalActiveHours: Math.round((totalActiveSeconds / 3600) * 10) / 10,
      totalIdleHours: Math.round((totalIdleSeconds / 3600) * 10) / 10,
      productiveHours: Math.round((productiveSeconds / 3600) * 10) / 10,
      communicationHours: Math.round((communicationSeconds / 3600) * 10) / 10,
      neutralHours: Math.round((neutralSeconds / 3600) * 10) / 10,
      unproductiveHours: Math.round((unproductiveSeconds / 3600) * 10) / 10,
      topApplications: topApps.map((app) => ({
        name: app.name,
        hours: Math.round((app.seconds / 3600) * 10) / 10,
        score: Math.round(app.score * 100),
      })),
      productivityTrend: trend,
    };

    return stats;
  }

  /**
   * Mark time as personal
   */
  async markPersonalTime(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    await db.query(
      `UPDATE activity_records
       SET is_personal_time = true
       WHERE user_id = $1
         AND activity_timestamp BETWEEN $2 AND $3`,
      [userId, startTime, endTime]
    );

    // Recalculate daily summary
    await this.updateDailySummary(userId, startTime);

    logger.info('Personal time marked', { userId, startTime, endTime });
  }

  /**
   * Get activity details for time range
   */
  async getActivityDetails(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ActivityRecord[]> {
    return await db.queryMany<ActivityRecord>(
      `SELECT *
       FROM activity_records
       WHERE user_id = $1
         AND activity_timestamp BETWEEN $2 AND $3
       ORDER BY activity_timestamp DESC`,
      [userId, startTime, endTime]
    );
  }

  /**
   * Clean up old screenshots
   */
  async cleanupOldScreenshots(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.screenshotRetentionDays);

    // Get old screenshot paths
    const oldScreenshots = await db.queryMany<{ screenshotPath: string }>(
      `SELECT DISTINCT screenshot_path as "screenshotPath"
       FROM activity_records
       WHERE screenshot_path IS NOT NULL
         AND activity_timestamp < $1`,
      [cutoffDate]
    );

    // Delete files
    for (const { screenshotPath } of oldScreenshots) {
      try {
        await fs.unlink(screenshotPath);
        logger.debug('Screenshot deleted', { path: screenshotPath });
      } catch (error: any) {
        logger.warn('Failed to delete screenshot', {
          path: screenshotPath,
          error: error.message,
        });
      }
    }

    // Clear references in database
    await db.query(
      `UPDATE activity_records
       SET screenshot_path = NULL
       WHERE screenshot_path IS NOT NULL
         AND activity_timestamp < $1`,
      [cutoffDate]
    );

    logger.info('Old screenshots cleaned up', {
      cutoffDate,
      count: oldScreenshots.length,
    });
  }

  /**
   * Get active remote workers
   */
  async getActiveRemoteWorkers(organizationId: string): Promise<any[]> {
    return await db.queryMany(
      `SELECT u.id, u.email, u.full_name, uas.last_heartbeat, uas.agent_version
       FROM users u
       JOIN user_activity_status uas ON u.id = uas.user_id
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE om.organization_id = $1
         AND uas.is_active = true
         AND uas.last_heartbeat > NOW() - INTERVAL '10 minutes'
       ORDER BY u.full_name`,
      [organizationId]
    );
  }
}
