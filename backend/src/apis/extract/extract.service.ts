import { Injectable } from '@nestjs/common';
import { ExtractRepository } from './extract.repository';
import { SendExtractionDto } from './dtos/send_extraction.dto';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";


@Injectable()
export class ExtractService {
  constructor(private readonly extractRepository: ExtractRepository) {}

  // Método privado para carregar PDF - centraliza a lógica
  private async loadPdfContent(pdfPath: string): Promise<string> {
    const loader = new PDFLoader(pdfPath);
    const doc = await loader.load();
    return doc[0].pageContent;
  }

  async processPdf(body: SendExtractionDto) {
    // Carrega o PDF uma vez e passa o conteúdo para o repository
    const pdfContent = await this.loadPdfContent(body.pdf_path);
    return this.extractRepository.sendPdfMain(body, pdfContent);
  }

  async processPdfOptimized(body: SendExtractionDto) {
    // Carrega o PDF uma vez e passa o conteúdo para o repository
    const pdfContent = await this.loadPdfContent(body.pdf_path);
    return this.extractRepository.sendPdfOptimized(body, pdfContent);
  }

  async processPdfLocal(body: SendExtractionDto) {
    // Carrega o PDF uma vez e passa o conteúdo para o repository
    const pdfContent = await this.loadPdfContent(body.pdf_path);
    return this.extractRepository.sendPdfLocal(body, pdfContent);
  }
}
