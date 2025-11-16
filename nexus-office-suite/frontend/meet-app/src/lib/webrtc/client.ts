import * as mediasoupClient from 'mediasoup-client';
import { Device, Transport, Producer, Consumer } from 'mediasoup-client/lib/types';

export interface TransportOptions {
  id: string;
  iceParameters: mediasoupClient.types.IceParameters;
  iceCandidates: mediasoupClient.types.IceCandidate[];
  dtlsParameters: mediasoupClient.types.DtlsParameters;
  sctpParameters?: mediasoupClient.types.SctpParameters;
}

export interface ProducerOptions {
  kind: mediasoupClient.types.MediaKind;
  rtpParameters: mediasoupClient.types.RtpParameters;
  appData?: Record<string, unknown>;
}

export class MediasoupClient {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private isInitialized = false;

  async init(routerRtpCapabilities: mediasoupClient.types.RtpCapabilities): Promise<void> {
    try {
      this.device = new mediasoupClient.Device();
      await this.device.load({ routerRtpCapabilities });
      this.isInitialized = true;
      console.log('Mediasoup device initialized');
    } catch (error) {
      console.error('Failed to initialize mediasoup device:', error);
      throw error;
    }
  }

  async createSendTransport(
    transportOptions: TransportOptions,
    onConnect: (dtlsParameters: mediasoupClient.types.DtlsParameters) => Promise<void>,
    onProduce: (
      kind: mediasoupClient.types.MediaKind,
      rtpParameters: mediasoupClient.types.RtpParameters,
      appData: Record<string, unknown>
    ) => Promise<string>,
    onConnectionStateChange?: (state: string) => void
  ): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    this.sendTransport = this.device.createSendTransport({
      id: transportOptions.id,
      iceParameters: transportOptions.iceParameters,
      iceCandidates: transportOptions.iceCandidates,
      dtlsParameters: transportOptions.dtlsParameters,
      sctpParameters: transportOptions.sctpParameters,
    });

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await onConnect(dtlsParameters);
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const producerId = await onProduce(kind, rtpParameters, appData);
        callback({ id: producerId });
      } catch (error) {
        errback(error as Error);
      }
    });

    if (onConnectionStateChange) {
      this.sendTransport.on('connectionstatechange', (state) => {
        onConnectionStateChange(state);
      });
    }

    return this.sendTransport;
  }

  async createRecvTransport(
    transportOptions: TransportOptions,
    onConnect: (dtlsParameters: mediasoupClient.types.DtlsParameters) => Promise<void>,
    onConnectionStateChange?: (state: string) => void
  ): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    this.recvTransport = this.device.createRecvTransport({
      id: transportOptions.id,
      iceParameters: transportOptions.iceParameters,
      iceCandidates: transportOptions.iceCandidates,
      dtlsParameters: transportOptions.dtlsParameters,
      sctpParameters: transportOptions.sctpParameters,
    });

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await onConnect(dtlsParameters);
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    if (onConnectionStateChange) {
      this.recvTransport.on('connectionstatechange', (state) => {
        onConnectionStateChange(state);
      });
    }

    return this.recvTransport;
  }

  async produceAudio(track: MediaStreamTrack): Promise<Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    const producer = await this.sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: true,
        opusDtx: true,
      },
      appData: { mediaType: 'audio' },
    });

    this.producers.set(producer.id, producer);

    producer.on('trackended', () => {
      console.log('Audio track ended');
      this.closeProducer(producer.id);
    });

    producer.on('transportclose', () => {
      console.log('Transport closed');
      this.producers.delete(producer.id);
    });

    return producer;
  }

  async produceVideo(track: MediaStreamTrack): Promise<Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    const producer = await this.sendTransport.produce({
      track,
      encodings: [
        { maxBitrate: 100000, scaleResolutionDownBy: 4 },
        { maxBitrate: 300000, scaleResolutionDownBy: 2 },
        { maxBitrate: 900000, scaleResolutionDownBy: 1 },
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000,
      },
      appData: { mediaType: 'video' },
    });

    this.producers.set(producer.id, producer);

    producer.on('trackended', () => {
      console.log('Video track ended');
      this.closeProducer(producer.id);
    });

    producer.on('transportclose', () => {
      console.log('Transport closed');
      this.producers.delete(producer.id);
    });

    return producer;
  }

  async produceScreen(track: MediaStreamTrack): Promise<Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    const producer = await this.sendTransport.produce({
      track,
      encodings: [{ maxBitrate: 1500000 }],
      appData: { mediaType: 'screen' },
    });

    this.producers.set(producer.id, producer);

    producer.on('trackended', () => {
      console.log('Screen share track ended');
      this.closeProducer(producer.id);
    });

    producer.on('transportclose', () => {
      console.log('Transport closed');
      this.producers.delete(producer.id);
    });

    return producer;
  }

  async consume(
    producerId: string,
    id: string,
    kind: mediasoupClient.types.MediaKind,
    rtpParameters: mediasoupClient.types.RtpParameters,
    appData?: Record<string, unknown>
  ): Promise<Consumer> {
    if (!this.recvTransport) {
      throw new Error('Receive transport not created');
    }

    const consumer = await this.recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      appData,
    });

    this.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      console.log('Consumer transport closed');
      this.consumers.delete(consumer.id);
    });

    return consumer;
  }

  closeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
    }
  }

  closeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }

  pauseProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.pause();
    }
  }

  resumeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.resume();
    }
  }

  getProducer(producerId: string): Producer | undefined {
    return this.producers.get(producerId);
  }

  getConsumer(consumerId: string): Consumer | undefined {
    return this.consumers.get(consumerId);
  }

  getRtpCapabilities(): mediasoupClient.types.RtpCapabilities | undefined {
    return this.device?.rtpCapabilities;
  }

  canProduce(kind: mediasoupClient.types.MediaKind): boolean {
    return this.device?.canProduce(kind) ?? false;
  }

  close(): void {
    // Close all producers
    this.producers.forEach((producer) => producer.close());
    this.producers.clear();

    // Close all consumers
    this.consumers.forEach((consumer) => consumer.close());
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    this.isInitialized = false;
    console.log('Mediasoup client closed');
  }

  isReady(): boolean {
    return this.isInitialized && this.device !== null;
  }
}

// Singleton instance
let mediasoupClientInstance: MediasoupClient | null = null;

export const getMediasoupClient = (): MediasoupClient => {
  if (!mediasoupClientInstance) {
    mediasoupClientInstance = new MediasoupClient();
  }
  return mediasoupClientInstance;
};

export const resetMediasoupClient = (): void => {
  if (mediasoupClientInstance) {
    mediasoupClientInstance.close();
    mediasoupClientInstance = null;
  }
};
