import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { TokenManagerService } from './token-manager.service';
import { GeminiClient } from './clients/gemini.client';
import { GeminiController } from './gemini.controller';
import { ProxyGuard } from './proxy.guard';

@Module({
  imports: [],
  controllers: [ProxyController, GeminiController],
  providers: [ProxyService, TokenManagerService, GeminiClient, ProxyGuard],
  exports: [TokenManagerService],
})
export class ProxyModule {}
