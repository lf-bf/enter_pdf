# Dockerfile para Enter PDF - Simples
FROM node:24-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar todo o conteúdo do backend
COPY backend/ ./

# Instalar dependências e fazer build
RUN npm ci && npm run build

# Criar diretório para PDFs
RUN mkdir -p /app/pdfs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando de inicialização
CMD ["node", "dist/main"]