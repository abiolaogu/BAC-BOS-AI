/**
 * NEXUS IDaaS - Database Client
 * PostgreSQL connection pool and query utilities
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });

    // Test connection
    this.testConnection();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('✅ Database connection established', {
        timestamp: result.rows[0].now,
      });
    } catch (error) {
      logger.error('❌ Failed to connect to database', { error });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: text.substring(0, 100),
          duration,
          rows: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      logger.error('Database query error', {
        query: text.substring(0, 100),
        params: params?.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute queries in a transaction
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a single query and return first row
   */
  public async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  public async queryMany<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Check if a record exists
   */
  public async exists(table: string, where: Record<string, any>): Promise<boolean> {
    const keys = Object.keys(where);
    const conditions = keys.map((key, idx) => `${key} = $${idx + 1}`).join(' AND ');
    const values = keys.map(key => where[key]);

    const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${conditions})`;
    const result = await this.queryOne<{ exists: boolean }>(query, values);
    return result?.exists || false;
  }

  /**
   * Insert a record
   */
  public async insert<T extends QueryResultRow = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = keys.map(key => data[key]);
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `
      INSERT INTO ${table} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.queryOne<T>(query, values);
    if (!result) {
      throw new Error(`Failed to insert record into ${table}`);
    }
    return result;
  }

  /**
   * Update a record
   */
  public async update<T extends QueryResultRow = any>(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const values = [...keys.map(key => data[key]), id];
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    return await this.queryOne<T>(query, values);
  }

  /**
   * Soft delete a record
   */
  public async softDelete(table: string, id: string): Promise<boolean> {
    const query = `
      UPDATE ${table}
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.queryOne(query, [id]);
    return result !== null;
  }

  /**
   * Hard delete a record
   */
  public async delete(table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
    const result = await this.queryOne(query, [id]);
    return result !== null;
  }

  /**
   * Count records
   */
  public async count(
    table: string,
    where?: Record<string, any>
  ): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    let values: any[] = [];

    if (where) {
      const keys = Object.keys(where);
      const conditions = keys.map((key, idx) => `${key} = $${idx + 1}`).join(' AND ');
      values = keys.map(key => where[key]);
      query += ` WHERE ${conditions}`;
    }

    const result = await this.queryOne<{ count: string }>(query, values);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Paginated query
   */
  public async paginate<T extends QueryResultRow = any>(
    baseQuery: string,
    params: any[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ rows: T[]; total: number; page: number; totalPages: number }> {
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery}) as subquery`;
    const countResult = await this.queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0', 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const rows = await this.queryMany<T>(paginatedQuery, [...params, limit, offset]);

    return {
      rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connections closed');
  }

  /**
   * Get pool stats
   */
  public getStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const db = Database.getInstance();
export default db;
