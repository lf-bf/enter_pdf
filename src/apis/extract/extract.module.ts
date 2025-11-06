import { Module } from '@nestjs/common';
import { ExtractController } from './extract.controller';
import { ExtractService } from './extract.service';
import { ExtractRepository } from './extract.repository';
import { CacheService } from '../../core/cache/cache.service';

@Module({
  controllers: [ExtractController],
  providers: [ExtractService, ExtractRepository, CacheService],
})
export class ExtractModule {}
