import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { LogWatcherModule } from './log-watcher/log-watcher.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SenderModule } from './sender/sender.module';

@Module({
  imports: [EventEmitterModule.forRoot(), LogWatcherModule, SenderModule],
  providers: [AppService],
})
export class AppModule {}
