import axios from 'axios';
import { services, ServiceConfig } from '../config/services';
import { logger } from '../middleware/logger';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

export const checkServiceHealth = async (service: ServiceConfig): Promise<HealthStatus> => {
  const startTime = Date.now();

  try {
    const healthUrl = `${service.url}${service.healthCheck || '/health'}`;
    const response = await axios.get(healthUrl, { timeout: 5000 });
    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      return {
        service: service.name,
        status: 'healthy',
        responseTime,
      };
    }

    return {
      service: service.name,
      status: 'unhealthy',
      responseTime,
      error: `Unexpected status code: ${response.status}`,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    logger.warn(`Health check failed for ${service.name}`, {
      error: error.message,
      responseTime,
    });

    return {
      service: service.name,
      status: 'unhealthy',
      responseTime,
      error: error.message,
    };
  }
};

export const checkAllServices = async (): Promise<HealthStatus[]> => {
  const healthChecks = services.map((service) => checkServiceHealth(service));
  return Promise.all(healthChecks);
};

export const getSystemHealth = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthStatus[];
  timestamp: string;
}> => {
  const serviceStatuses = await checkAllServices();

  const healthyCount = serviceStatuses.filter((s) => s.status === 'healthy').length;
  const totalCount = serviceStatuses.length;

  let systemStatus: 'healthy' | 'degraded' | 'unhealthy';

  if (healthyCount === totalCount) {
    systemStatus = 'healthy';
  } else if (healthyCount > 0) {
    systemStatus = 'degraded';
  } else {
    systemStatus = 'unhealthy';
  }

  return {
    status: systemStatus,
    services: serviceStatuses,
    timestamp: new Date().toISOString(),
  };
};
