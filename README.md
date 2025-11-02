<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

**Enter PDF** - A NestJS application for intelligent PDF information extraction using AI. This service extracts specific information from PDF documents based on custom schemas, supporting various document types like reports, certificates, contracts, and more.

## Features

- 🤖 **AI-Powered Extraction** - Uses OpenAI GPT models for intelligent information extraction
- 📄 **PDF Processing** - Supports various PDF formats using LangChain PDF loaders
- 🔧 **Custom Schemas** - Define exactly which information to extract using JSON schemas
- 📝 **Multiple Document Types** - Handles reports, certificates, contracts, and more
- ✅ **Validation** - Input validation using class-validator
- 🏗️ **NestJS Architecture** - Scalable and maintainable structure

## Technologies Used

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **OpenAI API** - GPT models for text extraction
- **LangChain** - PDF processing and document loading
- **Class Validator** - Request validation
- **Class Transformer** - Data transformation

## Project setup

```bash
$ npm install
```

## Environment Configuration

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Application Configuration
PORT=3000
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API Endpoints

### Extract PDF Information

**POST** `/extract`

Extracts information from PDF documents based on a provided schema.

#### Request Body (Required)
- `label` (string) - Document type (e.g., "report", "certificate", "contract")
- `extraction_schema` (object) - JSON schema defining which information to extract
- `pdf` (string) - Path to the PDF file or PDF content

#### Example Request

```bash
curl -X POST http://localhost:3002/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "label": "certificate",
    "extraction_schema": {
      "name": "",
      "date": "",
      "number": ""
    },
    "pdf": "/path/to/document.pdf"
  }'
```

#### Example Response

```json
{
  "name": "João Silva",
  "date": "2024-01-15",
  "number": "123456"
}
```

#### Advanced Schema Examples

**Certificate Extraction:**
```json
{
  "name": "",
  "document_number": "",
  "issue_date": "",
  "expiry_date": "",
  "issuing_authority": ""
}
```

**Contract Extraction:**
```json
{
  "parties": [],
  "contract_value": "",
  "start_date": "",
  "end_date": "",
  "terms": []
}
```

**Report Extraction:**
```json
{
  "instituicao_ensino": {
    "nome": "Nome da instituição de ensino",
    "cnpj": "CNPJ da instituição de ensino",
    "inscricao_estadual": "Inscrição Estadual da instituição, que pode ser um número ou 'ISENTO'",
    "endereco": "Endereço completo da instituição",
    "telefone": "Telefone de contato da instituição",
    "site": "Website oficial da instituição"
  },
  "responsavel_financeiro": {
    "nome": "Nome completo do responsável financeiro ou do aluno",
    "matricula": "Número de matrícula do aluno",
    "cpf": "CPF do responsável financeiro ou do aluno",
    "endereco": "Endereço completo do pagador"
  },
  "cobranca": {
    "valor_mensalidade": "Valor total da mensalidade a ser paga",
    "numero_titulo": "Número de identificação do título da cobrança",
    "data_vencimento": "Data limite para o pagamento do boleto"
  }
}
```

