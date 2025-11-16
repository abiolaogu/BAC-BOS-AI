import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { config } from '../config/config';
import logger from '../utils/logger';

class MediasoupService {
  private workers: mediasoupTypes.Worker[] = [];
  private currentWorkerIndex: number = 0;
  private readonly numWorkers: number;

  constructor() {
    this.numWorkers = Object.keys(require('os').cpus()).length;
  }

  async init() {
    logger.info(`Creating ${this.numWorkers} mediasoup workers...`);

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel as mediasoupTypes.WorkerLogLevel,
        logTags: config.mediasoup.worker.logTags as mediasoupTypes.WorkerLogTag[],
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        logger.error(`mediasoup worker ${worker.pid} died, exiting in 2 seconds...`);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      logger.info(`Created mediasoup worker ${i + 1}/${this.numWorkers} (PID: ${worker.pid})`);
    }
  }

  getWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(): Promise<mediasoupTypes.Router> {
    const worker = this.getWorker();
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs,
    });

    logger.info(`Created router on worker ${worker.pid}`);
    return router;
  }

  async createWebRtcTransport(router: mediasoupTypes.Router): Promise<mediasoupTypes.WebRtcTransport> {
    const transport = await router.createWebRtcTransport(config.mediasoup.webRtcTransport);

    logger.debug('Created WebRTC transport', { transportId: transport.id });
    return transport;
  }

  async close() {
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
  }
}

export const mediasoupService = new MediasoupService();
