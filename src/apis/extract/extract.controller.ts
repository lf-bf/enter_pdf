import { Controller, Post, Body } from '@nestjs/common';
import { ExtractService } from './extract.service';
import { SendExtractionDto } from './dtos/send_extraction.dto';

@Controller('extract')
export class ExtractController {
  constructor(private readonly extractService: ExtractService) {}

  @Post()
  async extractFromPdf(@Body() body: SendExtractionDto) {
    console.log('Received extraction request with body:', body);
    return this.extractService.processPdf(body);
  }

}