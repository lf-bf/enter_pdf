import { Controller, Post, Body } from '@nestjs/common';
import { ExtractService } from './extract.service';
import { SendExtractionDto } from './dtos/send_extraction.dto';

@Controller('extract')
export class ExtractController {
  constructor(private readonly extractService: ExtractService) {}

  @Post('main')
  async extractFromPdf(@Body() body: SendExtractionDto) {

    return this.extractService.processPdf(body);
  }

  @Post('optmized')
  async extractFromPdfOptimized(@Body() body: SendExtractionDto) {

    return this.extractService.processPdfOptimized(body);
  }

  @Post('optimized-v2')
  async extractFromPdfLocal(@Body() body: SendExtractionDto) {
  
    return this.extractService.processPdfLocal(body);
  }

}