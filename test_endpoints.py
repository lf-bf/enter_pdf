#!/usr/bin/env python3
"""
Script de teste assíncrono para os endpoints da API Enter PDF.

Executa testes em batch nos endpoints main, optmized e optmized-v2,
processando arquivos do dataset.json de forma assíncrona.

Uso:
    python test_endpoints.py --endpoint main --batch-size 50
    python test_endpoints.py --endpoint optmized --batch-size 25
"""

import asyncio
import aiohttp
import argparse
import json
import time
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
import sys


class EndpointTester:
    def __init__(self, endpoint: str, batch_size: int = 50):
        self.base_url = 'http://localhost:3004/api'
        self.endpoint = endpoint
        self.batch_size = batch_size
        self.results = []
        self.errors = []
        
        # Mapeamento de endpoints
        self.endpoint_map = {
            'main': '/extract/main',
            'optmized': '/extract/optmized', 
            'optmized-v2': '/extract/optimized-v2'
        }
        
        if endpoint not in self.endpoint_map:
            raise ValueError(f"Endpoint inválido: {endpoint}. Use: {list(self.endpoint_map.keys())}")
    
    def load_dataset(self, dataset_path: str) -> List[Dict]:
        """Carrega o dataset JSON."""
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"Dataset carregado: {len(data)} itens encontrados")
            return data
        except FileNotFoundError:
            print(f"Erro: Arquivo {dataset_path} não encontrado")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar JSON: {e}")
            sys.exit(1)
    
    def prepare_request_data(self, item: Dict) -> Dict:
        """Prepara os dados da requisição adicionando o prefixo do Docker."""
        return {
            "label": item["label"],
            "extraction_schema": item["extraction_schema"],
            "pdf_path": f"../pdfs/{item['pdf_path']}"
        }
    
    async def make_request(self, session: aiohttp.ClientSession, item: Dict, index: int) -> Dict:
        """Executa uma requisição assíncrona para o endpoint."""
        url = f"{self.base_url}{self.endpoint_map[self.endpoint]}"
        request_data = self.prepare_request_data(item)
        
        start_time = time.time()
        
        try:
            async with session.post(
                url,
                json=request_data,
                headers={'Content-Type': 'application/json'},
                timeout=aiohttp.ClientTimeout(total=120)  # 2 minutos timeout
            ) as response:
                end_time = time.time()
                response_time = end_time - start_time
                
                response_data = await response.text()
                
                result = {
                    'index': index,
                    'pdf_file': item['pdf_path'],
                    'label': item['label'],
                    'status_code': response.status,
                    'response_time_seconds': round(response_time, 3),
                    'success': response.status == 201,
                    'response_size': len(response_data),
                    'timestamp': datetime.now().isoformat()
                }
                
                if response.status == 201:
                    try:
                        result['response_data'] = json.loads(response_data)
                    except json.JSONDecodeError:
                        result['response_data'] = response_data
                else:
                    result['error'] = response_data
                
                return result
                
        except asyncio.TimeoutError:
            end_time = time.time()
            return {
                'index': index,
                'pdf_file': item['pdf_path'],
                'label': item['label'],
                'status_code': 'TIMEOUT',
                'response_time_seconds': round(end_time - start_time, 3),
                'success': False,
                'error': 'Request timeout (120s)',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            end_time = time.time()
            return {
                'index': index,
                'pdf_file': item['pdf_path'],
                'label': item['label'],
                'status_code': 'ERROR',
                'response_time_seconds': round(end_time - start_time, 3),
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def process_batch(self, session: aiohttp.ClientSession, batch: List[tuple], batch_num: int):
        """Processa um batch de requisições."""
        print(f"Processando batch {batch_num} ({len(batch)} itens)...")
        
        tasks = [
            self.make_request(session, item, index) 
            for index, item in batch
        ]
        
        batch_start = time.time()
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        batch_end = time.time()
        
        # Processar resultados
        successful = 0
        failed = 0
        
        for result in batch_results:
            if isinstance(result, Exception):
                self.errors.append({
                    'batch': batch_num,
                    'error': str(result),
                    'timestamp': datetime.now().isoformat()
                })
                failed += 1
            else:
                self.results.append(result)
                if result['success']:
                    successful += 1
                else:
                    failed += 1
        
        batch_time = round(batch_end - batch_start, 3)
        print(f"Batch {batch_num} concluído em {batch_time}s - {successful} sucessos, {failed} falhas")
    
    async def run_tests(self, dataset_path: str):
        """Executa todos os testes."""
        print(f"Iniciando testes para endpoint: {self.endpoint}")
        print(f"Configuração: batch_size={self.batch_size}, url={self.base_url}")
        print("=" * 60)
        
        # Carregar dataset
        dataset = self.load_dataset(dataset_path)
        
        # Criar batches
        batches = []
        for i in range(0, len(dataset), self.batch_size):
            batch = [(j, dataset[j]) for j in range(i, min(i + self.batch_size, len(dataset)))]
            batches.append(batch)
        
        print(f"Total de {len(dataset)} itens divididos em {len(batches)} batches")
        
        total_start = time.time()
        
        # Criar sessão HTTP
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Processar batches sequencialmente
            for batch_num, batch in enumerate(batches, 1):
                await self.process_batch(session, batch, batch_num)
                
                # Pausa entre batches para não sobrecarregar
                if batch_num < len(batches):
                    await asyncio.sleep(1)
        
        total_end = time.time()
        self.print_summary(total_end - total_start)
    
    def print_summary(self, total_time: float):
        """Imprime o resumo dos resultados."""
        print("\n" + "=" * 60)
        print("RESUMO DOS RESULTADOS")
        print("=" * 60)
        
        successful = len([r for r in self.results if r['success']])
        failed = len(self.results) - successful
        
        print(f"Tempo total: {round(total_time, 3)}s")
        print(f"Total de requisições: {len(self.results)}")
        print(f"Sucessos: {successful}")
        print(f"Falhas: {failed}")
        print(f"Taxa de sucesso: {round(successful/len(self.results)*100, 1) if self.results else 0}%")
        
        if self.results:
            response_times = [r['response_time_seconds'] for r in self.results if r['success']]
            if response_times:
                print(f"Tempo médio de resposta: {round(sum(response_times)/len(response_times), 3)}s")
                print(f"Tempo mínimo: {round(min(response_times), 3)}s")
                print(f"Tempo máximo: {round(max(response_times), 3)}s")
        
        # Salvar resultados em arquivo
        self.save_results()
        
        print(f"\nResultados salvos em: results_{self.endpoint}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    
    def save_results(self):
        """Salva os resultados em arquivo JSON."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"results_{self.endpoint}_{timestamp}.json"
        
        output = {
            'endpoint': self.endpoint,
            'batch_size': self.batch_size,
            'base_url': self.base_url,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_requests': len(self.results),
                'successful': len([r for r in self.results if r['success']]),
                'failed': len([r for r in self.results if not r['success']]),
            },
            'results': self.results,
            'errors': self.errors
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description='Teste assíncrono dos endpoints da API Enter PDF',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python test_endpoints.py --endpoint main
  python test_endpoints.py --endpoint optmized --batch-size 25
  python test_endpoints.py --endpoint optmized-v2 --batch-size 10
        """
    )
    
    parser.add_argument(
        '--endpoint', 
        required=True,
        choices=['main', 'optmized', 'optmized-v2'],
        help='Endpoint a ser testado'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=50,
        help='Tamanho do batch para processamento (padrão: 50)'
    )
    
    parser.add_argument(
        '--dataset',
        default='dataset.json',
        help='Caminho para o arquivo dataset.json (padrão: dataset.json)'
    )
    
    args = parser.parse_args()
    
    # Criar tester e executar
    tester = EndpointTester(
        endpoint=args.endpoint,
        batch_size=args.batch_size
    )
    
    try:
        asyncio.run(tester.run_tests(args.dataset))
    except KeyboardInterrupt:
        print("\nTeste interrompido pelo usuário")
    except Exception as e:
        print(f"\nErro durante execução: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()