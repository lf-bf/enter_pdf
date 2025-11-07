# Enter AI Fellowship - Take Away Project

Uma aplicação NestJS para extração inteligente de informações de documentos PDF utilizando inteligência artificial. Este projeto foi desenvolvido como solução para o desafio da Enter AI-Fellowship, focando em performance, redução de custos e velocidade de resposta.

## Sumário

- [Enter AI Fellowship - Take Away Project](#enter-ai-fellowship---take-away-project)
  - [Sumário](#sumário)
  - [Tecnologias Utilizadas](#tecnologias-utilizadas)
  - [Configuração e Execução](#configuração-e-execução)
    - [Passo a Passo de Instalação](#passo-a-passo-de-instalação)
  - [Testando os Endpoints com Script Python](#testando-os-endpoints-com-script-python)
    - [Executando os Testes](#executando-os-testes)
    - [Endpoints extras (curiosidade) - necessário chave de API sem restrições](#endpoints-extras-curiosidade---necessário-chave-de-api-sem-restrições)
    - [Parâmetros Disponíveis](#parâmetros-disponíveis)
    - [Resultados dos Testes](#resultados-dos-testes)
    - [Estrutura da Requisição](#estrutura-da-requisição)
      - [Corpo da Requisição (Obrigatório)](#corpo-da-requisição-obrigatório)
      - [Exemplo de Requisição](#exemplo-de-requisição)
      - [Exemplo de Resposta](#exemplo-de-resposta)
      - [Exemplo de Schemas Avançados](#exemplo-de-schemas-avançados)
  - [O Problema Identificado e Soluções Implementadas](#o-problema-identificado-e-soluções-implementadas)
    - [Otimização de Custos e Tokens](#otimização-de-custos-e-tokens)
    - [Estratégias de Busca Semântica](#estratégias-de-busca-semântica)
    - [Predicted Outputs e Modelo 4o-mini](#predicted-outputs-e-modelo-4o-mini)
  - [Resumo Executivo das Estratégias Implementadas](#resumo-executivo-das-estratégias-implementadas)
    - [Estratégias de Otimização e Trade-offs](#estratégias-de-otimização-e-trade-offs)
    - [Benefícios Quantificados](#benefícios-quantificados)
    - [Técnicas Aplicadas](#técnicas-aplicadas)

## Tecnologias Utilizadas

- **NestJS** - Framework Node.js progressivo
- **TypeScript** - Desenvolvimento type-safe
- **OpenAI API** - Modelos GPT para extração de texto
- **LangChain** - Processamento de PDF e carregamento de documentos
- **Transformers.js** - Embeddings locais para busca semântica

## Configuração e Execução

### Passo a Passo de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/lf-bf/enter_pdf
cd enter_pdf
```

2. **Configure as variáveis de ambiente**
```bash
# Edite o arquivo .env mock dentro de /backend
OPENAI_API_KEY = "api_key_enter"

```

3. **Prepare a pasta de PDFs e o arquivo JSON**
- Coloque todos os Pdf's necessários para avaliação na pasta "pdfs" (Tem que ser esta pasta se não o Docker não irá conseguir ler os pdfs).
- Carregue o arquivo dataset.json, caso tenha um outro nome, você poderá passar o parametro --dataset e especificar o caminho desejado para o arquivo.
  
- **Importante** ressaltar que o arquivo dataset.json segue o mesmo exemplo proposto pela Enter no repositório de exemplo fornecido, ou seja o pdf_path, deve apenas incluir o nome do arquivo, pois o script já está lendo e colocando o path correto de acordo com a pasta "pdfs". (Isso é bem importante se não o Docker não possui acesso aos arquivos)

4. **Build e execute o container**
```bash
# Build e executar em uma única linha (~3 minutos)
docker-compose up -d --build

# Verificar logs (interessante para uma análise mais detalhada sobre o que está acontencendo no Backend)
docker-compose logs -f
```

5. **Instale as dependências do Python**
```bash
pip install -r requirements.txt
```

6. **Rode o Script para testar o Endpoint principal do desafio**
```bash
python test_endpoints.py --endpoint main 
```

```bash
# Caso haja outro arquivo json, com outro nome
python test_endpoints.py --endpoint main --dataset custom_dataset.json
```

## Testando os Endpoints com Script Python

O projeto inclui um script de teste assíncrono (`test_endpoints.py`) que permite testar os endpoints de forma automatizada processando múltiplos documentos do dataset.

### Executando os Testes

```bash
# Teste do endpoint principal (GPT-5-mini)
python test_endpoints.py --endpoint main
```

### Endpoints extras (curiosidade) - necessário chave de API sem restrições
```bash
# Teste do endpoint otimizado (GPT-4o-mini com embeddings)
python test_endpoints.py --endpoint optmized

# Teste do endpoint v2 (GPT-4o-mini com busca semântica manual)
python test_endpoints.py --endpoint optmized-v2
```

### Parâmetros Disponíveis

- **`--endpoint`** (obrigatório) - Especifica qual endpoint testar:
  - `main`: Endpoint principal com GPT-5-mini
  - `optmized`: Endpoint otimizado com GPT-4o-mini e embeddings
  - `optmized-v2`: Endpoint v2 com GPT-4o-mini e busca local

- **`--batch-size`** (opcional) - Define quantas requisições processar por lote:
  - Padrão: 50

- **`--dataset`** (opcional) - Caminho para arquivo de dataset personalizado:
  - Padrão: `dataset.json`
  - Exemplo: `--dataset meu_dataset.json`


### Resultados dos Testes

O script gera:

1. **Logs em tempo real** mostrando progresso dos lotes
2. **Resumo final** com estatísticas de sucesso/falha
3. **Arquivo JSON** com resultados detalhados: `results_{endpoint}_{timestamp}.json`

**Exemplo de saída:**
```
Processando batch 1 (10 itens)...
Batch 1 concluído em 45.2s - 9 sucessos, 1 falhas

RESUMO DOS RESULTADOS
Total de requisições: 10
Sucessos: 9
Falhas: 1
Taxa de sucesso: 90.0%
Tempo médio de resposta: 6.8s
```

### Estrutura da Requisição

Todos os endpoints utilizam a mesma estrutura de dados:

#### Corpo da Requisição (Obrigatório)
- `label` (string) - Tipo do documento (ex: "report", "certificate", "contract")
- `extraction_schema` (object) - Schema JSON definindo quais informações extrair
- `pdf_path` (string) - Caminho para o arquivo PDF ou conteúdo do PDF

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:3004/extract/main \
  -H "Content-Type: application/json" \
  -d '{
    "label": "carteira_oab",
    "extraction_schema": {
      "nome": "Nome do profissional, normalmente no canto superior esquerdo da imagem",
      "inscricao": "Número de inscrição do profissional",
      "seccional": "Seccional do profissional",
      "subsecao": "Subseção à qual o profissional faz parte",
      "categoria": "Categoria, pode ser ADVOGADO, ADVOGADA, SUPLEMENTAR, ESTAGIARIO, ESTAGIARIA",
      "endereco_profissional": "Endereço do profissional",
      "telefone_profissional": "Telefone do profissional",
      "situacao": "Situação do profissional, normalmente no canto inferior direito."
    },
    "pdf_path": "oab_1.pdf"
  }'
```

#### Exemplo de Resposta

```json
{
  "nome": "JOANA D'ARC",
  "inscricao": "101943",
  "seccional": "PR",
  "subsecao": "CONSELHO SECCIONAL - PARANÁ",
  "categoria": "SUPLEMENTAR",
  "endereco_profissional": "AVENIDA PAULISTA, Nº 2300 andar Pilotis, Bela Vista, SÃO PAULO - SP, 01310300",
  "telefone_profissional": null,
  "situacao": "SITUAÇÃO REGULAR"
}
```

#### Exemplo de Schemas Avançados

O sistema suporta schemas complexos e aninhados para diferentes tipos de documentos, fiz isso levando em consideração uma extração mais avançada, que necessita de mais dados e geralmente um documento com muitos mais caracteres:

**Extração de Relatórios Financeiros (Exemplo Complexo Usando Agrupamentos e subgrupos):**
```json
{
  "instituicao_ensino": {
    "nome": "",
    "cnpj": "",
    "inscricao_estadual": "",
    "endereco": "",
    "telefone": "",
    "site": ""
  },
  "responsavel_financeiro": {
    "nome": "",
    "matricula": "",
    "cpf": "",
    "endereco": ""
  },
  "cobranca": {
    "valor_mensalidade": "",
    "numero_titulo": "",
    "data_vencimento": ""
  }
}
```

## O Problema Identificado e Soluções Implementadas

Durante o desenvolvimento, identifiquei um "problema" com o modelo GPT-5-mini da OpenAI, que apresentava latências de aproximadamente 20 segundos para respostas simples. A solução foi ajustar o parâmetro `effort` para `minimal`, pois se trata de um modelo da família Reasoning da OpenAI que requer configuração específica para otimização de performance. Ajustei para Low para avaliar diferenças com o `minimal`  e ainda que muito sutil, há um sacrificio de performance e interpretabilidade do modelo, mas claro há um ganho muito considerável de latência (~4/5 segundos) enquanto com low adquiro ~6/9 segundos. (Confira os results_examples para uma análise mais detalhada, os 2 primeiros arquivos comparam claramente esse custo de performance vs tempo de processamento).

### Otimização de Custos e Tokens

Partindo da premissa de redução de custos, analisei profundamente o uso de tokens. Simplesmente processar o conteúdo completo de PDFs extensos resulta em custos elevados. Considerando experiência profissional prévia com a OAB-PR, vários cenários podem lidar com documentos de várias extensões e formatos diferentes, desenvolvi uma abordagem de busca semântica que extrai apenas as informações necessárias baseadas nas chaves do `extraction_schema` e também suas sub-chaves (caso hajam).

A implementação utiliza algoritmos de similaridade complementares com propósitos específicos:

- **Jaccard**: Mede sobreposição de palavras entre as chaves do schema e chunks do PDF. Ideal para identificar similaridade semântica baseada em vocabulário comum, especialmente eficaz para campos textuais como nomes, endereços e descrições.

- **Manhattan**: Adaptado para análise de frequência de palavras, calculando diferenças na distribuição textual. Excelente para detectar padrões estruturados como CPFs, CNPJs, datas e valores monetários que seguem formatos específicos.

A combinação estratégica permite que o Jaccard capture contexto semântico enquanto o Manhattan identifica padrões estruturais, resultando em uma busca mais precisa e uma redução drástica de custos de tokens superior a 50%.

### Estratégias de Busca Semântica

Desenvolvi duas abordagens distintas para diferentes cenários de uso:

1. **Embeddings (Similaridade de Cossenos) + Jaccard**: Utiliza embeddings locais combinados com similaridade de Jaccard. Complexidade técnica baixa, com tempo de processamento de aproximadamente 1,5 segundos.

2. **Jaccard + Manhattan**: Abordagem puramente estatística e algorítmica, oferecendo velocidade extrema de menos de 1ms por ser baseada apenas em cálculos matemáticos.

### Predicted Outputs e Modelo 4o-mini

Expandindo além do escopo inicial (puramente por curiosidade), testei além do GPT-5-mini o modelo 4o-mini, estudando os `predicted_outputs` disponíveis nos modelos da família 4o. Esta funcionalidade permite especificar previamente parte do que será retornado na response, apliquei de forma para criar um output estruturado JSON. Isso garante que o output SEMPRE siga o formato requisitado, reduzindo ainda mais o esforço computacional e a contagem de tokens. 

**Importante** ressaltar que `predicted_outputs` são completamente diferentes de `structured_outputs`, já que o ultimo realiza um parse JSON usando um objeto previamente declarado e indexa automáticamente as informações antes de serem retornadas para o usuário, o que praticamente 95% dos casos, funciona muito mal. Realizei testes também utilizando essa funcionalidade porém é tão mal implementada e otimizada que aumentava praticamente em 25 segundos cada requisição.

O modelo 4o-mini se mostrou não apenas o mais rápido (respostas em menos de 5 segundos), mas também o mais econômico, custando $0.15 por 1M de tokens versus $0.25 do modelo 5-mini - uma redução de 40% nos custos.

## Resumo Executivo das Estratégias Implementadas

### Estratégias de Otimização e Trade-offs

| Estratégia | Performance | Custo | Complexidade | Uso Recomendado |
|-----------|------------|-------|-------------|------------------|
| **GPT-5-mini + Jaccard/Manhattan** | ⭐⭐⭐ (7-8s) | ⭐⭐ ($0.25/1M) | ⭐⭐ | Requisitos do desafio |
| **GPT-4o-mini + Embeddings (Similaridade de Cossenos)** | ⭐⭐⭐⭐ (4-5s) | ⭐⭐⭐⭐ ($0.15/1M) | ⭐⭐⭐ | Produção balanceada |
| **GPT-4o-mini + Jaccard/Manhattan** | ⭐⭐⭐⭐⭐ (<3s) | ⭐⭐⭐⭐⭐ | ⭐ | Larga escala |

### Benefícios Quantificados

**Performance**: Redução de latência de 20s → 3-8s (60-85% de melhoria)

**Custo**: Economia superior a 50% via busca semântica + 40% adicional com modelo 4o-mini

**Escalabilidade**: Busca semântica local permite processamento massivo de documentos maiores com latência < 1ms de processamento

### Técnicas Aplicadas

1. **Busca Semântica Inteligente**: Combinação estratégica de algoritmos Jaccard + Manhattan
2. **Predicted Outputs**: Implementação para estruturação garantida de JSON e redução drástica de custos por token. (Estruturas JSON consomem muitos Tokens ao serem gerados)
3. **Otimização de Reasoning**: Configuração específica do GPT-5-mini para balancear latência/qualidade
4. **Arquitetura Modular**: Sistema flexível que permite a análise de qualquer documento de qualquer formato.

A implementação demonstra como diferentes combinações de modelos de IA e algoritmos podem ser estrategicamente orquestradas para otimizar o trade-off entre performance, custo e complexidade técnica, oferecendo soluções adaptadas para diversos cenários de uso.

