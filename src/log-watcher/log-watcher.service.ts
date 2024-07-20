import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as process from 'process';
import * as moment from 'moment';
import * as readline from 'readline';
import { Tail } from 'tail';
import * as os from 'node:os';
import * as path from 'node:path';

export interface LogEvent {
  datetime: Date;
  username?: string;
  type: 'connect' | 'disconnect' | 'avatar_change';
}

export interface UserInfo {
  username: string;
  connectedAt: Date;
}

@Injectable()
export class LogWatcherService {
  constructor(private readonly eventEmitter: EventEmitter2) {}
  private readonly log = new Logger('LogWatcherService');
  private logFile?: string;
  private logDir = '/Volumes/VRChat/VRChat/'; /*path.join(
    os.homedir(),
    '\\AppData\\LocalLow\\VRChat\\VRChat\\',
  );*/

  private currentUsers: Map<string, UserInfo> = new Map<string, UserInfo>();

  public async init(): Promise<void> {
    this.log.log(`Getting files from VRC Dir`);
    this.log.log(`Reading ${this.logDir} dir`);

    const files = fs.readdirSync(this.logDir);
    const logFiles = files.filter((file) => file.indexOf('output_log') != -1);
    this.log.log(`Founded ${logFiles.length} files`);

    const logDir = this.logDir;
    const sortedLogs = logFiles.sort(function (a, b) {
      return (
        fs.statSync(logDir + b).mtime.getTime() -
        fs.statSync(logDir + a).mtime.getTime()
      );
    });

    this.logFile = sortedLogs[0];
    this.log.log(`Select latest log file: ${this.logFile}`);
    await this.initRead();
    this.initTailRead();
  }

  private async initRead(): Promise<void> {
    if (!this.logFile) {
      this.log.error(`No selected log file`);
      process.exit(0);
      return;
    }

    this.log.log(`Init read log file`);
    const rl = readline.createInterface({
      input: fs.createReadStream(this.logDir + this.logFile),
      crlfDelay: Infinity,
    });

    let linesRead = 0;
    for await (const line of rl) {
      linesRead += 1;
      const event = this.parseLog(line);
      if (!event) continue;
      this.updateStorage(event);
    }

    this.log.log(`Read ${linesRead} lines`);
    this.log.log(
      `Collected ${Array.from(this.currentUsers.values()).length} connected users`,
    );

    this.eventEmitter.emit('vrc.sync', {
      users: this.currentUsers,
    });
  }

  private initTailRead(): void {
    this.log.log(`Connect to log file`);

    const tail = new Tail(this.logDir + this.logFile);
    tail.on('line', (line: string) => {
      const event = this.parseLog(line);
      if (!event) return;

      this.log.log(
        `Handled ${event.type} event user: ${event.username} (${event.datetime.toISOString()})`,
      );

      this.updateStorage(event);
      this.eventEmitter.emit('vrc.event', {
        event: event,
        users: this.currentUsers,
      });
    });
  }

  @OnEvent('sender.connected')
  private onSenderReady(): void {
    if (Array.from(this.currentUsers.values()).length != 0) {
      this.eventEmitter.emit('vrc.sync', {
        users: this.currentUsers,
      });
    }
  }

  private updateStorage(event: LogEvent): void {
    if (event.type == 'connect') {
      this.currentUsers.set(event.username, {
        username: event.username,
        connectedAt: event.datetime,
      });
    } else if (event.type == 'disconnect') {
      this.currentUsers.delete(event.username);
    }
  }

  private parseLog(line: string): LogEvent | undefined {
    if (line.indexOf('OnPlayerJoined') != -1) {
      const match = line.match(/(.*) Log .*\[Behaviour\] OnPlayerJoined (.*)/);
      if (!match || match.length == 1) return;

      return {
        username: match[2],
        type: 'connect',
        datetime: moment(match[1], 'YYYY.MM.DD HH:mm:ss').toDate(),
      };
    }

    if (line.indexOf('OnPlayerLeft') != -1) {
      const match = line.match(/(.*) Log .*\[Behaviour\] OnPlayerLeft (.*)/);
      if (!match || match.length == 1) return;

      return {
        username: match[2],
        type: 'disconnect',
        datetime: moment(match[1], 'YYYY.MM.DD HH:mm:ss').toDate(),
      };
    }
  }
}
