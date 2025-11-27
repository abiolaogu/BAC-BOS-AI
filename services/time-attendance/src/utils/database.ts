/**
 * NEXUS Time & Attendance - Database Connection
 * PostgreSQL with TimescaleDB support
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';

class Database {
  private pool: Pool | null = null;

  /**
   * Initialize database connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    const config = {
      connectionString: process.env.DATABASE_URL,
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(config);

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connected successfully');
    } catch (error: any) {
      logger.error('Database connection failed', { error: error.message });
      throw error;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err.message });
    });
  }

  /**
   * Close database connection pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database disconnected');
    }
  }

  /**
   * Get pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();

    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Query executed', {
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error: any) {
      logger.error('Query error', {
        query: text.substring(0, 100),
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Execute a query and return single row
   */
  async queryOne<T = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return multiple rows
   */
  async queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute query with transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if record exists
   */
  async exists(
    table: string,
    conditions: Record<string, any>
  ): Promise<boolean> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');

    const result = await this.query(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause})`,
      values
    );

    return result.rows[0].exists;
  }

  /**
   * Get count
   */
  async count(
    table: string,
    conditions?: Record<string, any>
  ): Promise<number> {
    if (!conditions || Object.keys(conditions).length === 0) {
      const result = await this.query(`SELECT COUNT(*) FROM ${table}`);
      return parseInt(result.rows[0].count);
    }

    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');

    const result = await this.query(
      `SELECT COUNT(*) FROM ${table} WHERE ${whereClause}`,
      values
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Bulk insert
   */
  async bulkInsert<T>(
    table: string,
    columns: string[],
    rows: any[][]
  ): Promise<T[]> {
    if (rows.length === 0) {
      return [];
    }

    const placeholders = rows
      .map(
        (_, rowIndex) =>
          `(${columns
            .map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`)
            .join(', ')})`
      )
      .join(', ');

    const values = rows.flat();

    const result = await this.query<T>(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES ${placeholders}
       RETURNING *`,
      values
    );

    return result.rows;
  }
}

export const db = new Database();
