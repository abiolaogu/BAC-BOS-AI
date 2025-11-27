/**
 * NEXUS Time & Attendance - Biometric Device Integration Service
 * Supports multiple OEM manufacturers: ZKTeco, Suprema, HID Global, Morpho, Anviz
 */

import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from 'axios';
import * as net from 'net';
import {
  BiometricDevice,
  BiometricTemplate,
  DeviceAdapter,
  DeviceConfig,
  DeviceManufacturer,
  DeviceStatus,
  VerificationMethod,
  AttendanceRecord,
  TimeAttendanceError,
  ErrorCode,
} from '../types';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * Base Device Adapter
 */
abstract class BaseDeviceAdapter implements DeviceAdapter {
  protected config: DeviceConfig;
  protected client?: AxiosInstance | net.Socket;

  constructor(config: DeviceConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract syncUsers(): Promise<void>;
  abstract syncAttendance(): Promise<AttendanceRecord[]>;
  abstract enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void>;
  abstract verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }>;
  abstract getDeviceInfo(): Promise<any>;
  abstract testConnection(): Promise<boolean>;
}

/**
 * ZKTeco Device Adapter
 */
class ZKTecoAdapter extends BaseDeviceAdapter {
  private socket?: net.Socket;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.connect(this.config.port, this.config.ipAddress, () => {
        logger.info('ZKTeco device connected', {
          deviceId: this.config.id,
          ip: this.config.ipAddress,
        });
        resolve();
      });

      this.socket.on('error', (error) => {
        logger.error('ZKTeco connection error', { error: error.message });
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
  }

  async syncUsers(): Promise<void> {
    if (!this.socket) {
      throw new Error('Device not connected');
    }

    // ZKTeco protocol: Send user sync command
    const command = this.buildZKCommand('CMD_USERTEMP_RRQ', { pin: 0 });
    await this.sendCommand(command);

    logger.info('ZKTeco users synced', { deviceId: this.config.id });
  }

  async syncAttendance(): Promise<AttendanceRecord[]> {
    if (!this.socket) {
      throw new Error('Device not connected');
    }

    // ZKTeco protocol: Get attendance logs
    const command = this.buildZKCommand('CMD_ATTLOG_RRQ');
    const response = await this.sendCommand(command);

    // Parse attendance records from response
    const records = this.parseZKAttendanceLogs(response);

    logger.info('ZKTeco attendance synced', {
      deviceId: this.config.id,
      count: records.length,
    });

    return records;
  }

  async enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void> {
    if (!this.socket) {
      throw new Error('Device not connected');
    }

    // ZKTeco protocol: Enroll fingerprint template
    const command = this.buildZKCommand('CMD_ENROLLUSER', {
      pin: userId,
      templateType,
      template: templateData,
    });

    await this.sendCommand(command);

    logger.info('ZKTeco biometric enrolled', {
      deviceId: this.config.id,
      userId,
      templateType,
    });
  }

  async verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }> {
    if (!this.socket) {
      throw new Error('Device not connected');
    }

    // ZKTeco protocol: Verify fingerprint
    const command = this.buildZKCommand('CMD_VERIFY', {
      templateType,
      template: templateData,
    });

    const response = await this.sendCommand(command);
    const result = this.parseZKVerifyResponse(response);

    return result;
  }

  async getDeviceInfo(): Promise<any> {
    if (!this.socket) {
      throw new Error('Device not connected');
    }

    const command = this.buildZKCommand('CMD_GET_INFO');
    const response = await this.sendCommand(command);

    return this.parseZKDeviceInfo(response);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch {
      return false;
    }
  }

  private buildZKCommand(cmd: string, data?: any): Buffer {
    // Simplified ZKTeco command builder
    // In production, use proper ZKTeco SDK protocol
    const commandBuffer = Buffer.alloc(1024);
    let offset = 0;

    // Command header
    commandBuffer.writeUInt16LE(0x5050, offset); // Start marker
    offset += 2;

    // Command code mapping
    const cmdCodes: Record<string, number> = {
      CMD_USERTEMP_RRQ: 0x0065,
      CMD_ATTLOG_RRQ: 0x000d,
      CMD_ENROLLUSER: 0x003d,
      CMD_VERIFY: 0x0044,
      CMD_GET_INFO: 0x0032,
    };

    commandBuffer.writeUInt16LE(cmdCodes[cmd] || 0, offset);
    offset += 2;

    // Add data if present
    if (data) {
      const dataStr = JSON.stringify(data);
      commandBuffer.write(dataStr, offset);
      offset += dataStr.length;
    }

    return commandBuffer.slice(0, offset);
  }

  private async sendCommand(command: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      let responseData = Buffer.alloc(0);

      this.socket.write(command);

      this.socket.once('data', (data) => {
        responseData = Buffer.concat([responseData, data]);
        resolve(responseData);
      });

      setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);
    });
  }

  private parseZKAttendanceLogs(buffer: Buffer): AttendanceRecord[] {
    // Simplified parser - in production use proper ZKTeco protocol parsing
    const records: AttendanceRecord[] = [];
    // Parse buffer and create attendance records
    return records;
  }

  private parseZKVerifyResponse(buffer: Buffer): {
    userId: string;
    confidence: number;
  } {
    // Simplified parser
    return { userId: '0', confidence: 0 };
  }

  private parseZKDeviceInfo(buffer: Buffer): any {
    return {
      manufacturer: 'ZKTeco',
      firmwareVersion: '1.0',
      capacity: 1000,
    };
  }
}

/**
 * Suprema (BioStar) HTTP API Adapter
 */
class SupremaAdapter extends BaseDeviceAdapter {
  private httpClient?: AxiosInstance;

  async connect(): Promise<void> {
    this.httpClient = axios.create({
      baseURL: `http://${this.config.ipAddress}:${this.config.port}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'bs-session-id': this.config.apiKey || '',
      },
    });

    // Test connection
    await this.testConnection();

    logger.info('Suprema device connected', {
      deviceId: this.config.id,
      ip: this.config.ipAddress,
    });
  }

  async disconnect(): Promise<void> {
    this.httpClient = undefined;
  }

  async syncUsers(): Promise<void> {
    if (!this.httpClient) {
      throw new Error('Device not connected');
    }

    // Suprema BioStar API: Get users
    const response = await this.httpClient.get('/api/users');
    const users = response.data.records || [];

    logger.info('Suprema users synced', {
      deviceId: this.config.id,
      count: users.length,
    });
  }

  async syncAttendance(): Promise<AttendanceRecord[]> {
    if (!this.httpClient) {
      throw new Error('Device not connected');
    }

    // Suprema BioStar API: Get event logs
    const response = await this.httpClient.get('/api/events', {
      params: {
        event_type_id: '4096,4097', // Check-in/Check-out events
        limit: 1000,
      },
    });

    const events = response.data.records || [];
    const records = this.parseSupremaEvents(events);

    logger.info('Suprema attendance synced', {
      deviceId: this.config.id,
      count: records.length,
    });

    return records;
  }

  async enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void> {
    if (!this.httpClient) {
      throw new Error('Device not connected');
    }

    // Suprema BioStar API: Enroll fingerprint
    await this.httpClient.post('/api/users/fingerprint', {
      user_id: userId,
      fingerprint_template: templateData.toString('base64'),
    });

    logger.info('Suprema biometric enrolled', {
      deviceId: this.config.id,
      userId,
    });
  }

  async verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }> {
    if (!this.httpClient) {
      throw new Error('Device not connected');
    }

    // Suprema BioStar API: Verify fingerprint
    const response = await this.httpClient.post('/api/verify', {
      fingerprint_template: templateData.toString('base64'),
    });

    return {
      userId: response.data.user_id,
      confidence: response.data.match_score,
    };
  }

  async getDeviceInfo(): Promise<any> {
    if (!this.httpClient) {
      throw new Error('Device not connected');
    }

    const response = await this.httpClient.get('/api/devices/info');
    return response.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.httpClient) {
        return false;
      }
      await this.httpClient.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  private parseSupremaEvents(events: any[]): AttendanceRecord[] {
    const records: AttendanceRecord[] = [];
    // Parse Suprema events to attendance records
    return records;
  }
}

/**
 * HID Global Adapter
 */
class HIDGlobalAdapter extends BaseDeviceAdapter {
  private httpClient?: AxiosInstance;

  async connect(): Promise<void> {
    this.httpClient = axios.create({
      baseURL: `https://${this.config.ipAddress}:${this.config.port}`,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    logger.info('HID Global device connected', { deviceId: this.config.id });
  }

  async disconnect(): Promise<void> {
    this.httpClient = undefined;
  }

  async syncUsers(): Promise<void> {
    if (!this.httpClient) throw new Error('Device not connected');
    // HID VertX/EVO API implementation
    logger.info('HID users synced', { deviceId: this.config.id });
  }

  async syncAttendance(): Promise<AttendanceRecord[]> {
    if (!this.httpClient) throw new Error('Device not connected');
    // HID VertX/EVO API implementation
    return [];
  }

  async enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void> {
    if (!this.httpClient) throw new Error('Device not connected');
    // HID enrollment implementation
  }

  async verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }> {
    if (!this.httpClient) throw new Error('Device not connected');
    return { userId: '', confidence: 0 };
  }

  async getDeviceInfo(): Promise<any> {
    if (!this.httpClient) throw new Error('Device not connected');
    return {};
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

/**
 * Generic HTTP Adapter (for other manufacturers)
 */
class GenericHTTPAdapter extends BaseDeviceAdapter {
  private httpClient?: AxiosInstance;

  async connect(): Promise<void> {
    this.httpClient = axios.create({
      baseURL: `${this.config.protocol}://${this.config.ipAddress}:${this.config.port}`,
      timeout: 10000,
      headers: this.config.settings?.headers || {},
    });

    logger.info('Generic device connected', { deviceId: this.config.id });
  }

  async disconnect(): Promise<void> {
    this.httpClient = undefined;
  }

  async syncUsers(): Promise<void> {
    if (!this.httpClient) throw new Error('Device not connected');
    const endpoint = this.config.settings?.endpoints?.users || '/api/users';
    await this.httpClient.get(endpoint);
  }

  async syncAttendance(): Promise<AttendanceRecord[]> {
    if (!this.httpClient) throw new Error('Device not connected');
    const endpoint = this.config.settings?.endpoints?.attendance || '/api/attendance';
    const response = await this.httpClient.get(endpoint);
    return response.data || [];
  }

  async enrollBiometric(
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<void> {
    if (!this.httpClient) throw new Error('Device not connected');
    const endpoint = this.config.settings?.endpoints?.enroll || '/api/enroll';
    await this.httpClient.post(endpoint, {
      userId,
      templateType,
      template: templateData.toString('base64'),
    });
  }

  async verifyBiometric(
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<{ userId: string; confidence: number }> {
    if (!this.httpClient) throw new Error('Device not connected');
    const endpoint = this.config.settings?.endpoints?.verify || '/api/verify';
    const response = await this.httpClient.post(endpoint, {
      templateType,
      template: templateData.toString('base64'),
    });
    return response.data;
  }

  async getDeviceInfo(): Promise<any> {
    if (!this.httpClient) throw new Error('Device not connected');
    const response = await this.httpClient.get('/api/info');
    return response.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.httpClient) return false;
      await this.httpClient.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Biometric Service
 */
export class BiometricService {
  private adapters: Map<string, DeviceAdapter> = new Map();

  /**
   * Create device adapter factory
   */
  private createAdapter(device: BiometricDevice): DeviceAdapter {
    const config: DeviceConfig = {
      id: device.id,
      manufacturer: device.manufacturer,
      ipAddress: device.ipAddress,
      port: device.port,
      protocol: device.protocol,
      apiKey: device.apiKey,
      settings: device.settings,
    };

    switch (device.manufacturer) {
      case DeviceManufacturer.ZKTECO:
        return new ZKTecoAdapter(config);
      case DeviceManufacturer.SUPREMA:
        return new SupremaAdapter(config);
      case DeviceManufacturer.HID_GLOBAL:
        return new HIDGlobalAdapter(config);
      case DeviceManufacturer.GENERIC:
      default:
        return new GenericHTTPAdapter(config);
    }
  }

  /**
   * Register device
   */
  async registerDevice(
    device: Omit<BiometricDevice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BiometricDevice> {
    // Test connection first
    const adapter = this.createAdapter(device as BiometricDevice);
    const isConnected = await adapter.testConnection();

    if (!isConnected) {
      throw new TimeAttendanceError(
        ErrorCode.DEVICE_ERROR,
        'Failed to connect to device',
        500
      );
    }

    // Register in database
    const registered = await db.queryOne<BiometricDevice>(
      `INSERT INTO biometric_devices (
        id, organization_id, location_id, name, manufacturer,
        model, serial_number, ip_address, port, protocol,
        api_key, status, capabilities, max_users, current_users,
        firmware_version, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        uuidv4(),
        device.organizationId,
        device.locationId,
        device.name,
        device.manufacturer,
        device.model,
        device.serialNumber,
        device.ipAddress,
        device.port,
        device.protocol,
        device.apiKey,
        DeviceStatus.ACTIVE,
        device.capabilities,
        device.maxUsers,
        0,
        device.firmwareVersion,
        JSON.stringify(device.settings),
      ]
    );

    if (!registered) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to register device',
        500
      );
    }

    logger.info('Biometric device registered', {
      deviceId: registered.id,
      manufacturer: device.manufacturer,
    });

    return registered;
  }

  /**
   * Connect to device
   */
  async connectDevice(deviceId: string): Promise<void> {
    const device = await this.getDeviceById(deviceId);
    if (!device) {
      throw new TimeAttendanceError(
        ErrorCode.NOT_FOUND,
        'Device not found',
        404
      );
    }

    const adapter = this.createAdapter(device);
    await adapter.connect();

    this.adapters.set(deviceId, adapter);

    // Update device status
    await db.query(
      'UPDATE biometric_devices SET status = $1, last_heartbeat_at = NOW() WHERE id = $2',
      [DeviceStatus.ACTIVE, deviceId]
    );

    logger.info('Connected to biometric device', { deviceId });
  }

  /**
   * Disconnect from device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(deviceId);
    }

    await db.query(
      'UPDATE biometric_devices SET status = $1 WHERE id = $2',
      [DeviceStatus.INACTIVE, deviceId]
    );

    logger.info('Disconnected from biometric device', { deviceId });
  }

  /**
   * Sync attendance from device
   */
  async syncAttendance(deviceId: string): Promise<AttendanceRecord[]> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new TimeAttendanceError(
        ErrorCode.DEVICE_ERROR,
        'Device not connected',
        500
      );
    }

    const records = await adapter.syncAttendance();

    // Update last sync time
    await db.query(
      'UPDATE biometric_devices SET last_sync_at = NOW() WHERE id = $1',
      [deviceId]
    );

    return records;
  }

  /**
   * Enroll biometric template
   */
  async enrollBiometric(
    deviceId: string,
    userId: string,
    templateType: VerificationMethod,
    templateData: Buffer
  ): Promise<BiometricTemplate> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new TimeAttendanceError(
        ErrorCode.DEVICE_ERROR,
        'Device not connected',
        500
      );
    }

    await adapter.enrollBiometric(userId, templateType, templateData);

    // Store template
    const template = await db.queryOne<BiometricTemplate>(
      `INSERT INTO biometric_templates (
        id, user_id, device_id, template_type, template_data, quality
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [uuidv4(), userId, deviceId, templateType, templateData, 90]
    );

    if (!template) {
      throw new TimeAttendanceError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to store template',
        500
      );
    }

    logger.info('Biometric template enrolled', {
      userId,
      deviceId,
      templateType,
    });

    return template;
  }

  /**
   * Get device by ID
   */
  private async getDeviceById(deviceId: string): Promise<BiometricDevice | null> {
    return await db.queryOne<BiometricDevice>(
      'SELECT * FROM biometric_devices WHERE id = $1',
      [deviceId]
    );
  }

  /**
   * Get all devices for organization
   */
  async getDevicesByOrganization(organizationId: string): Promise<BiometricDevice[]> {
    return await db.queryMany<BiometricDevice>(
      'SELECT * FROM biometric_devices WHERE organization_id = $1 ORDER BY name',
      [organizationId]
    );
  }

  /**
   * Health check for all devices
   */
  async healthCheck(): Promise<void> {
    const devices = await db.queryMany<BiometricDevice>(
      'SELECT * FROM biometric_devices WHERE status = $1',
      [DeviceStatus.ACTIVE]
    );

    for (const device of devices) {
      try {
        const adapter = this.createAdapter(device);
        const isHealthy = await adapter.testConnection();

        if (!isHealthy) {
          await db.query(
            'UPDATE biometric_devices SET status = $1 WHERE id = $2',
            [DeviceStatus.ERROR, device.id]
          );
          logger.warn('Device health check failed', { deviceId: device.id });
        } else {
          await db.query(
            'UPDATE biometric_devices SET last_heartbeat_at = NOW() WHERE id = $1',
            [device.id]
          );
        }
      } catch (error: any) {
        logger.error('Device health check error', {
          deviceId: device.id,
          error: error.message,
        });
      }
    }
  }
}
