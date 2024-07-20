import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LogWatcherService } from './log-watcher/log-watcher.service';
import { SenderService } from './sender/sender.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly logWatcherService: LogWatcherService,
    private readonly senderService: SenderService,
  ) {}

  private readonly log = new Logger('App');
  public async onModuleInit(): Promise<void> {
    this.log.log(`Start application`);
    await this.senderService.init();
    setTimeout(async () => {
      await this.logWatcherService.init();
    }, 2000);
  }
}
