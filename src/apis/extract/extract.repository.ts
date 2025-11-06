import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from "@langchain/openai";
import { CallbackHandler } from "@langfuse/langchain";
import { SendExtractionDto } from './dtos/send_extraction.dto';
import { extractSchemaSkeleton } from '../../core/utils/extractionSkeleton';
import { semanticSearchTransformers } from '../../core/utils/semanticSearchTransformers';
import { localParsingStrategy } from '../../core/utils/semanticSearchLocal';
import { CacheService } from '../../core/cache/cache.service';
import { z } from 'zod';


@Injectable()
export class ExtractRepository {
  constructor(private readonly cacheService: CacheService) {}


  async sendPdfMain(body: SendExtractionDto, pdfContent: string) {
    const startTime = Date.now();
    const requestId = `extraction-${Date.now()}`;
    
    console.log(`[${requestId}] Starting PDF extraction for document type: ${body.label}`);
    console.time(`[${requestId}] Total extraction time`);


    const schemaSkeletonObject = extractSchemaSkeleton(body.extraction_schema);
    
    // Usar a estratégia de parsing local com configuração otimizada
    const localConfig = {
      algorithms: 'both' as const,
      chunkSize: 400,
      threshold: 0.08,  // Threshold mais baixo para capturar mais dados
      maxChunks: 25     // Mais chunks para melhor cobertura
    };

    // Aplicar busca semântica para reduzir o conteúdo do PDF
    console.log(`[${requestId}] Starting semantic search to summarize PDF content`);
    //const pdfContentSummarized = await semanticSearchTransformers(pdfContent, schemaSkeletonObject);
    const pdfContentSummarized = await localParsingStrategy(pdfContent, schemaSkeletonObject, localConfig);
    console.log(`[${requestId}] Semantic search completed. Original content: ${pdfContent.length} chars, Summarized: ${pdfContentSummarized.length} chars`);

    // Criar schema estruturado para structured output
    //const extractionSchema = this.createStringSchema(body.extraction_schema);
    

    const llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-5-mini-2025-08-07",
        
    });
    
    //Prompt em Markdown
    const response = await llm.invoke([
        {
            role: "system",
            content: `
                # JSON Data Parser

                Extract and parse data from the provided text content into the specified JSON schema structure.

                ## Instructions
                - Parse the content and map data to the exact schema structure
                - Return only valid JSON matching the schema
                - Use \`null\` for missing values
                - All responses in Portuguese

                ## Output
                Return ONLY the JSON object, no additional text or formatting.`,
        },
        {
            role: "user",
            content: `
                **DOCUMENT TYPE:** ${body.label}

                **EXTRACTION SCHEMA:**
                \`\`\`json
                ${JSON.stringify(body.extraction_schema, null, 2)}
                \`\`\`

                **PDF CONTENT:**
                ${pdfContentSummarized}

                Extract the information according to the provided schema.`,
        },
    
        ],
    );

    const endTime = Date.now();
    const executionTimeSeconds = (endTime - startTime) / 1000;
    
    // Log detalhado da resposta e informações de tokens
    console.log(`[${requestId}] Raw response:`, response.content);
    console.log(`[${requestId}] Response type:`, typeof response.content);
    console.log(`[${requestId}] Response keys:`, Object.keys(response.content || {}));
    
    // Logs de tokens e logprobs
    if (response.response_metadata) {
      console.log(`[${requestId}] Response Metadata:`, JSON.stringify(response.response_metadata, null, 2));
    }
    
    // Logprobs (se disponível via additional_kwargs)
    if (response.additional_kwargs) {
      console.log(`[${requestId}] Additional Info:`, JSON.stringify(response.additional_kwargs, null, 2));
    }
    
    console.timeEnd(`[${requestId}] Total extraction time`);
    console.log(`[${requestId}] PDF extraction completed in ${executionTimeSeconds.toFixed(2)} seconds`);
    console.log(`[${requestId}] Response JSON:`, JSON.stringify(response.content, null, 2));

    return response.content;
  }


  async sendPdfOptimized(body: SendExtractionDto, pdfContent: string) {
    // Implementação da função otimizada
    
    const startTime = Date.now();
    const requestId = `extraction-${Date.now()}`;
    
    console.log(`[${requestId}] Starting PDF extraction for document type: ${body.label}`);
    console.time(`[${requestId}] Total extraction time`);

    const schemaSkeletonObject = extractSchemaSkeleton(body.extraction_schema);
    const schemaSkeleton = JSON.stringify(schemaSkeletonObject, null, 2);
    console.log(`[${requestId}] Schema skeleton:`, schemaSkeleton);

    // Aplicar busca semântica para reduzir o conteúdo do PDF somente se tiver tamanho maior que 1000 chars.
    var pdfContentSummarized = pdfContent;
    if (pdfContent.length > 1000) {
      console.log(`[${requestId}] Starting semantic search to summarize PDF content`);

      pdfContentSummarized = await semanticSearchTransformers(pdfContent, schemaSkeletonObject);

      console.log(pdfContentSummarized)
      console.log(`[${requestId}] Semantic search completed. Original content: ${pdfContent.length} chars, Summarized: ${pdfContentSummarized.length} chars`);
    }
    

    // Modelo da família 4.x otimizado para usar predicted Outputs
    const llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
    }).withConfig(
        {
            prediction: {
                type: "content",
                content: schemaSkeleton,
            },
        }
    );
    
    const response = await llm.invoke([
        {
            role: "system",
            content: `
                # JSON Data Parser

                Extract and parse data from the provided text content into the specified JSON schema structure.

                ## Instructions
                - Parse the content and map data to the exact schema structure
                - Return only valid JSON matching the schema
                - Use \`null\` for missing values
                - All responses in Portuguese

                ## Output
                Return ONLY the JSON object, no additional text or formatting.`,
        },
        {
            role: "user",
            content: `
                **DOCUMENT TYPE:** ${body.label}

                **EXTRACTION SCHEMA:**
                \`\`\`json
                ${JSON.stringify(body.extraction_schema, null, 2)}
                \`\`\`

                **PDF CONTENT:**
                ${pdfContentSummarized}

                Extract the information according to the provided schema.`,
        },
    
        ],
    );

    const endTime = Date.now();
    const executionTimeSeconds = (endTime - startTime) / 1000;
    
    // Logs de tokens e informações da resposta
    if (response.response_metadata) {
      console.log(`[${requestId}] Response Metadata:`, JSON.stringify(response.response_metadata, null, 2));
    }
    
    if (response.additional_kwargs) {
      console.log(`[${requestId}] Additional Info:`, JSON.stringify(response.additional_kwargs, null, 2));
    }
    
    console.timeEnd(`[${requestId}] Total extraction time`);
    console.log(`[${requestId}] PDF extraction completed in ${executionTimeSeconds.toFixed(2)} seconds`);
    console.log(`[${requestId}] Response content length: ${response.content?.length || 0} characters`);

    return response.content;

  }

  async sendPdfLocal(body: SendExtractionDto, pdfContent: string) {
    const startTime = Date.now();
    const requestId = `local-extraction-${Date.now()}`;
    
    console.log(`[${requestId}] Starting LOCAL PDF extraction for document type: ${body.label}`);
    console.time(`[${requestId}] Total local extraction time`);

    console.log(`[${requestId}] PDF content loaded: ${pdfContent.length} characters`);

    // Usar a estratégia de parsing local com configuração otimizada
    const localConfig = {
      algorithms: 'both' as const,
      chunkSize: 400,
      threshold: 0.08,  // Threshold mais baixo para capturar mais dados
      maxChunks: 25     // Mais chunks para melhor cobertura
    };

    const schemaSkeletonObject = extractSchemaSkeleton(body.extraction_schema);
    const schemaSkeleton = JSON.stringify(schemaSkeletonObject, null, 2);

    console.log(`[${requestId}] Starting local parsing strategy`);
    const extractedData = await localParsingStrategy(pdfContent, schemaSkeletonObject, localConfig);

    console.log(extractedData)
    console.log(`[${requestId}] Semantic search completed. Original content: ${pdfContent.length} chars, Summarized: ${extractedData.length} chars`);

   // Modelo da família 4.x otimizado para usar predicted Outputs
    const llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
    }).withConfig(
        {
            prediction: {
                type: "content",
                content: schemaSkeleton,
            },
        }
    );
    
    const response = await llm.invoke([
        {
            role: "system",
            content: `
                # JSON Data Parser

                Extract and parse data from the provided text content into the specified JSON schema structure.

                ## Instructions
                - Parse the content and map data to the exact schema structure
                - Return only valid JSON matching the schema
                - Use \`null\` for missing values
                - All responses in Portuguese

                ## Output
                Return ONLY the JSON object, no additional text or formatting.`,
        },
        {
            role: "user",
            content: `
                **DOCUMENT TYPE:** ${body.label}

                **EXTRACTION SCHEMA:**
                \`\`\`json
                ${JSON.stringify(body.extraction_schema, null, 2)}
                \`\`\`

                **PDF CONTENT:**
                ${extractedData}

                Extract the information according to the provided schema.`,
        },
    
        ],
    );

    const endTime = Date.now();
    const executionTimeSeconds = (endTime - startTime) / 1000;
    
    // Logs de tokens e informações da resposta
    if (response.response_metadata) {
      console.log(`[${requestId}] Response Metadata:`, JSON.stringify(response.response_metadata, null, 2));
    }
    
    if (response.additional_kwargs) {
      console.log(`[${requestId}] Additional Info:`, JSON.stringify(response.additional_kwargs, null, 2));
    }
    
    console.timeEnd(`[${requestId}] Total extraction time`);
    console.log(`[${requestId}] PDF extraction completed in ${executionTimeSeconds.toFixed(2)} seconds`);
    console.log(`[${requestId}] Response content length: ${response.content?.length || 0} characters`);

    return response.content;
  }
}
