import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from "@langchain/openai";
import { CallbackHandler } from "@langfuse/langchain";
import { SendExtractionDto } from './dtos/send_extraction.dto';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { extractSchemaSkeleton } from '../../core/utils/extractionSkeleton';


@Injectable()
export class ExtractRepository {
  constructor() {}

  async sendPdf(body: SendExtractionDto) {
    const startTime = Date.now();
    const requestId = `extraction-${Date.now()}`;
    
    console.log(`[${requestId}] Starting PDF extraction for document type: ${body.label}`);
    console.time(`[${requestId}] Total extraction time`);

    // Inicializa the Langfuse CallbackHandler
    const langfuseHandler = new CallbackHandler({
        sessionId: "user-session-123",
        userId: "user-abc",
        tags: ["enter-pdf"],
    });


    // Lógica para extrair texto do PDF usando PDFLoader, é passado o caminho absoluto do arquivo
    const loader = new PDFLoader(body.pdf);

    const doc = await loader.load();

    const schemaSkeletonObject = extractSchemaSkeleton(body.extraction_schema);
    const schemaSkeleton = JSON.stringify(schemaSkeletonObject, null, 2);
    console.log(`[${requestId}] Schema skeleton:`, schemaSkeleton);

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
                # PDF Information Extraction System

                ## Main Objective
                You are a specialized assistant that extracts specific information from PDF documents based on a provided extraction schema.

                ## Language
                - All responses must be in **Portuguese**.

                ## Input Parameters
                You will receive **3 essential parameters**:

                1. **\`label\`** - Document type (report, power of attorney, certificate, contract, etc.)
                2. **\`extraction_schema\`** - **CRUCIAL FACTOR** - Defines exactly which information must be extracted
                3. **\`pdf\`** - Complete textual content of the PDF

                ## Critical Instructions

                ### TOTAL ATTENTION to extraction_schema
                - The \`extraction_schema\` is the **MOST IMPORTANT** element
                - It defines **EXACTLY** which fields and information you must extract
                - **IGNORE** any information not specified in the schema

                ### Mandatory Reading Process
                1. **First pass**: Read the PDF from **TOP to BOTTOM** completely
                2. **Second pass**: Re-read from **BOTTOM to TOP** for revalidation
                3. **Cross-validation**: Compare information found in both readings

                ### Document Analysis
                - Consider the \`label\` to contextualize the document type
                - Identify relevant sections based on document type
                - Pay attention to specific patterns of the document type

                ## MANDATORY OUTPUT FORMAT

                **THE OUTPUT MUST BE EXACTLY:**
                - **Valid JSON** format
                - Structure **IDENTICAL** to the \`extraction_schema\`
                - All schema fields must be present
                - Values filled in their corresponding fields
                - If information is not found, use \`null\`.

                **IMPORTANT**: Return ONLY the JSON, without additional text, explanations, or markdown formatting.`,
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
                ${doc[0].pageContent}

                Extract the information according to the provided schema.`,
        },
    
        ],
    );

    const endTime = Date.now();
    const executionTimeSeconds = (endTime - startTime) / 1000;
    
    console.timeEnd(`[${requestId}] Total extraction time`);
    console.log(`[${requestId}] PDF extraction completed in ${executionTimeSeconds.toFixed(2)} seconds`);
    console.log(`[${requestId}] Response content length: ${response.content?.length || 0} characters`);

    return response.content;
  }
}
