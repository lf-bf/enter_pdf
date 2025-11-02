import { Module } from '@nestjs/common';
import { ExtractController } from './extract.controller';
import { ExtractService } from './extract.service';
import { ExtractRepository } from './extract.repository';

@Module({
  controllers: [ExtractController],
  providers: [ExtractService, ExtractRepository],
})
export class ExtractModule {}
