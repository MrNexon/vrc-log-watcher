import { Module } from '@nestjs/common';
import { LogWatcherService } from './log-watcher.service';

@Module({
  providers: [LogWatcherService],
  exports: [LogWatcherService],
})
export class LogWatcherModule {}
