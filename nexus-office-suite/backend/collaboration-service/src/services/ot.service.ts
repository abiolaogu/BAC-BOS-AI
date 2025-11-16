import { createClient, RedisClientType } from 'redis';
import { logger } from '../middleware/logger';

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position?: number;
  text?: string;
  length?: number;
}

export interface DocumentOperation {
  documentId: string;
  userId: string;
  operations: Operation[];
  version: number;
  timestamp: number;
}

export interface DocumentVersion {
  documentId: string;
  version: number;
  content: string;
  lastModified: number;
}

/**
 * Operational Transformation Service
 * Handles real-time collaborative editing with conflict resolution
 */
export class OTService {
  private redisClient: RedisClientType | null = null;

  async initialize(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
      await this.redisClient.connect();

      logger.info('Redis connected for OT service');
    } catch (error) {
      logger.error('Failed to connect to Redis for OT', { error });
      throw error;
    }
  }

  async applyOperation(docOp: DocumentOperation): Promise<DocumentOperation> {
    if (!this.redisClient) throw new Error('Redis not initialized');

    const lockKey = `lock:${docOp.documentId}`;
    const locked = await this.acquireLock(lockKey);

    if (!locked) {
      throw new Error('Failed to acquire document lock');
    }

    try {
      // Get current version
      const currentVersion = await this.getDocumentVersion(docOp.documentId);

      if (!currentVersion) {
        throw new Error('Document version not found');
      }

      // Check if operation version matches
      if (docOp.version < currentVersion.version) {
        // Need to transform operation
        const transformedOp = await this.transformOperation(docOp, currentVersion.version);
        docOp = transformedOp;
      }

      // Apply operation to content
      const newContent = this.applyOperationsToContent(currentVersion.content, docOp.operations);

      // Update version
      const newVersion: DocumentVersion = {
        documentId: docOp.documentId,
        version: currentVersion.version + 1,
        content: newContent,
        lastModified: Date.now(),
      };

      await this.saveDocumentVersion(newVersion);

      // Store operation in history
      await this.storeOperation(docOp);

      logger.debug('Operation applied', {
        documentId: docOp.documentId,
        version: newVersion.version,
      });

      return {
        ...docOp,
        version: newVersion.version,
      };
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async getDocumentVersion(documentId: string): Promise<DocumentVersion | null> {
    if (!this.redisClient) return null;

    const key = `doc:version:${documentId}`;
    const data = await this.redisClient.get(key);

    if (!data) {
      // Initialize with empty document
      const initialVersion: DocumentVersion = {
        documentId,
        version: 0,
        content: '',
        lastModified: Date.now(),
      };
      await this.saveDocumentVersion(initialVersion);
      return initialVersion;
    }

    return JSON.parse(data);
  }

  async saveDocumentVersion(version: DocumentVersion): Promise<void> {
    if (!this.redisClient) return;

    const key = `doc:version:${version.documentId}`;
    await this.redisClient.set(key, JSON.stringify(version));
  }

  async storeOperation(docOp: DocumentOperation): Promise<void> {
    if (!this.redisClient) return;

    const key = `doc:ops:${docOp.documentId}`;
    await this.redisClient.rPush(key, JSON.stringify(docOp));

    // Keep only last 1000 operations
    await this.redisClient.lTrim(key, -1000, -1);
  }

  async getOperationsSince(documentId: string, version: number): Promise<DocumentOperation[]> {
    if (!this.redisClient) return [];

    const key = `doc:ops:${documentId}`;
    const opsData = await this.redisClient.lRange(key, 0, -1);

    const operations: DocumentOperation[] = opsData
      .map((data) => JSON.parse(data))
      .filter((op) => op.version > version);

    return operations;
  }

  private async transformOperation(
    operation: DocumentOperation,
    targetVersion: number
  ): Promise<DocumentOperation> {
    // Get all operations between current and target version
    const intermediateOps = await this.getOperationsSince(
      operation.documentId,
      operation.version
    );

    // Transform against each intermediate operation
    let transformedOps = operation.operations;

    for (const intermediateOp of intermediateOps) {
      transformedOps = this.transformOperations(transformedOps, intermediateOp.operations);
    }

    return {
      ...operation,
      operations: transformedOps,
      version: targetVersion,
    };
  }

  private transformOperations(ops1: Operation[], ops2: Operation[]): Operation[] {
    // Simplified OT transformation
    // In production, use a library like ot.js or ShareDB
    const transformed: Operation[] = [];

    for (const op of ops1) {
      let transformedOp = { ...op };

      for (const otherOp of ops2) {
        if (otherOp.type === 'insert' && op.position && otherOp.position) {
          if (otherOp.position <= op.position) {
            transformedOp.position = op.position + (otherOp.text?.length || 0);
          }
        } else if (otherOp.type === 'delete' && op.position && otherOp.position) {
          if (otherOp.position < op.position) {
            transformedOp.position = Math.max(
              otherOp.position,
              op.position - (otherOp.length || 0)
            );
          }
        }
      }

      transformed.push(transformedOp);
    }

    return transformed;
  }

  private applyOperationsToContent(content: string, operations: Operation[]): string {
    let result = content;

    for (const op of operations) {
      if (op.type === 'insert' && op.position !== undefined && op.text) {
        result = result.slice(0, op.position) + op.text + result.slice(op.position);
      } else if (op.type === 'delete' && op.position !== undefined && op.length) {
        result = result.slice(0, op.position) + result.slice(op.position + op.length);
      }
    }

    return result;
  }

  private async acquireLock(key: string, timeout: number = 5000): Promise<boolean> {
    if (!this.redisClient) return false;

    const acquired = await this.redisClient.set(key, '1', {
      NX: true,
      PX: timeout,
    });

    return acquired !== null;
  }

  private async releaseLock(key: string): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.del(key);
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
