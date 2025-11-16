import { Pool } from 'pg';

/**
 * Database Migration Integration Tests
 * Tests database schema, migrations, and data integrity
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nexus_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

describe('Database Migrations', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('Schema Validation', () => {
    it('should have users table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('should have documents table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'documents'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('should have spreadsheets table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'spreadsheets'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('should have presentations table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'presentations'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Column Validation', () => {
    it('should have correct users table columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);

      const columns = result.rows.map(r => r.column_name);

      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('password_hash');
      expect(columns).toContain('name');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should have email as unique in users table', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%email%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Foreign Keys', () => {
    it('should have foreign key from documents to users', async () => {
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'documents'
        AND ccu.table_name = 'users';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Indexes', () => {
    it('should have index on users email', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users'
        AND indexname LIKE '%email%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have index on documents owner_id', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'documents'
        AND indexname LIKE '%owner%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should enforce NOT NULL constraints', async () => {
      await expect(
        pool.query(`
          INSERT INTO users (email, name)
          VALUES (NULL, 'Test User');
        `)
      ).rejects.toThrow();
    });

    it('should enforce UNIQUE constraints', async () => {
      const email = `unique-${Date.now()}@example.com`;

      await pool.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, 'hash', 'User 1');
      `, [email]);

      await expect(
        pool.query(`
          INSERT INTO users (email, password_hash, name)
          VALUES ($1, 'hash', 'User 2');
        `, [email])
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [email]);
    });

    it('should cascade delete documents when user deleted', async () => {
      // Create user
      const userResult = await pool.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, 'hash', 'Cascade Test User')
        RETURNING id;
      `, [`cascade-${Date.now()}@example.com`]);

      const userId = userResult.rows[0].id;

      // Create document
      await pool.query(`
        INSERT INTO documents (owner_id, title, content)
        VALUES ($1, 'Test Doc', 'Content');
      `, [userId]);

      // Delete user
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // Check documents deleted
      const docResult = await pool.query(`
        SELECT COUNT(*)
        FROM documents
        WHERE owner_id = $1;
      `, [userId]);

      expect(parseInt(docResult.rows[0].count)).toBe(0);
    });
  });

  describe('Triggers', () => {
    it('should auto-update updated_at timestamp', async () => {
      // Create user
      const createResult = await pool.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, 'hash', 'Timestamp Test')
        RETURNING id, updated_at;
      `, [`timestamp-${Date.now()}@example.com`]);

      const userId = createResult.rows[0].id;
      const originalTimestamp = createResult.rows[0].updated_at;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update user
      await pool.query(`
        UPDATE users
        SET name = 'Updated Name'
        WHERE id = $1;
      `, [userId]);

      // Check timestamp updated
      const updateResult = await pool.query(`
        SELECT updated_at
        FROM users
        WHERE id = $1;
      `, [userId]);

      const newTimestamp = updateResult.rows[0].updated_at;

      expect(new Date(newTimestamp).getTime()).toBeGreaterThan(
        new Date(originalTimestamp).getTime()
      );

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    });
  });

  describe('Performance', () => {
    it('should efficiently query large dataset', async () => {
      const startTime = Date.now();

      await pool.query(`
        SELECT * FROM users LIMIT 1000;
      `);

      const duration = Date.now() - startTime;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should use indexes for common queries', async () => {
      const result = await pool.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM users WHERE email = 'test@example.com';
      `);

      const plan = JSON.stringify(result.rows[0]);

      // Should use index scan, not sequential scan
      expect(plan).toContain('Index Scan');
    });
  });
});
