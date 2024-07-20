import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export const SOCKET_URL = 'https://bot.fpdr.space';

@Injectable()
export class SenderService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  private readonly log = new Logger('SenderService');
  private socket?: Socket;

  public init(): Promise<void> {
    this.log.log(`Init socket connection: ${SOCKET_URL}`);
    this.socket = io(SOCKET_URL);

    this.log.log(`Waiting for connection`);
    this.socket.on('disconnect', () => {
      this.log.log(`Connection disconnected (${this.socket.id})`);
    });

    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        this.log.log(`Connection established (${this.socket.id})`);
        this.socket.emit('daemon.init');
        this.eventEmitter.emit('sender.connected');
        resolve();
      });
    });
  }

  @OnEvent('vrc.sync')
  public onSync(data: any): void {
    this.log.log(`Sending sync event`);
    this.socket.emit('vrc.sync', Array.from(data.users.values()));
  }

  @OnEvent('vrc.event')
  public onEvent(data: any): void {
    this.socket.emit('vrc.event', {
      event: data.event,
      users: Array.from(data.users.values()),
    });
  }
}
