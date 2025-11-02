import { Injectable } from '@nestjs/common';
import { ExtractRepository } from './extract.repository';
import { SendExtractionDto } from './dtos/send_extraction.dto';


@Injectable()
export class ExtractService {
  constructor(private readonly extractRepository: ExtractRepository) {}

  async processPdf(body: SendExtractionDto) {

    return this.extractRepository.sendPdf(body);
  }

  
}
