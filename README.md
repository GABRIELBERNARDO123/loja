# Vértice Digital — Loja de produtos digitais

Loja virtual completa para venda de arquivos digitais no Brasil, com catálogo, carrinho, checkout Pix via Mercado Pago, entrega automática por download protegido, contas de clientes, painel administrativo com MFA e banco PostgreSQL.

> **Estado desta entrega:** aplicação compilada e testada localmente. Pagamentos e armazenamento em nuvem ficam **pendentes de configuração de credenciais** até que você informe as chaves reais. Leia a seção “Antes de receber dinheiro real”.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estrito
- Tailwind CSS 3
- PostgreSQL + Prisma ORM (migrations versionadas)
- Argon2id para senhas (`@node-rs/argon2`)
- Sessões opacas em cookie HttpOnly/Secure/SameSite=Lax, hash SHA-256 no banco
- TOTP (RFC 6238) para MFA de administradores, segredo criptografado com AES-256-GCM
- Zod em todas as entradas de API
- Vercel Blob privado (ou armazenamento local em desenvolvimento)
- Mercado Pago Pix com webhook assinado e confirmação server-to-server
- Vitest (unitários/integração) e Playwright (E2E)

## Requisitos

- Node.js 20.9+ (recomendado 20 ou 22 LTS)
- PostgreSQL 14+ (Neon recomendado em produção)
- Conta Mercado Pago (sandbox para testes)
- Conta Vercel + Vercel Blob para produção

## Instalação local

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# Edite .env. Gere segredos com:
#   openssl rand -base64 48   -> AUTH_SECRET
#   openssl rand -base64 32   -> ENCRYPTION_KEY

# 3. Banco PostgreSQL (exemplo com Docker; use Neon se preferir)
docker run --name loja-digital-db \
  -e POSTGRES_USER=loja \
  -e POSTGRES_PASSWORD=loja_local_dev_2026 \
  -e POSTGRES_DB=loja \
  -p 5434:5432 -d postgres:16-alpine

# Ajuste DATABASE_URL no .env:
# postgresql://loja:loja_local_dev_2026@127.0.0.1:5434/loja?schema=public

# 4. Migrations e conteúdo inicial
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# 5. Primeiro administrador (MFA obrigatório)
ADMIN_EMAIL="admin@seudominio.com" \
ADMIN_NAME="Administrador" \
ADMIN_PASSWORD="SenhaForte#2026" \
npm run bootstrap:admin

# Guarde o segredo TOTP exibido no console. Ele não é salvo no repositório.
# 6. Desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`. O painel fica em `/admin` e exige senha + código TOTP.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm run typecheck` | TypeScript estrito sem emissão |
| `npm run lint` | ESLint (Next) |
| `npm test` | Vitest: unitários + integração |
| `npm run test:e2e` | Playwright (requer build e servidor ou `PLAYWRIGHT_BASE_URL`) |
| `npm run db:migrate` | Aplica migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Categorias, produtos de exemplo, cupom e configurações |
| `npm run bootstrap:admin` | Cria administrador com TOTP |
| `npm run check` | lint + typecheck + testes + build |

## Testes

Os testes de integração usam um banco PostgreSQL separado definido em `.env.test`. Nunca use o banco de produção.

```bash
cp .env.test.example .env.test
# Ajuste DATABASE_URL para um banco de teste (ex.: loja_test)
npm test

# E2E (com servidor de produção já ativo ou via webServer automático)
npm run build
npm run test:e2e
```

O E2E do painel só executa quando as variáveis `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` e `E2E_ADMIN_TOTP_SECRET` estiverem definidas:

```bash
E2E_ADMIN_EMAIL="admin@teste.com" \
E2E_ADMIN_PASSWORD="..." \
E2E_ADMIN_TOTP_SECRET="..." \
npm run test:e2e
```

## Armazenamento de arquivos digitais

- **Desenvolvimento:** `STORAGE_DRIVER=local`, arquivos em `.private-storage/` (fora de `public/`).
- **Produção:** `STORAGE_DRIVER=vercel-blob` e `BLOB_READ_WRITE_TOKEN`. Os arquivos são enviados com `access: private`.
- Downloads passam por `/api/download/[entitlementId]`, que valida sessão, propriedade da compra, status do pedido, revogação, expiração e limite de downloads.
- Links públicos permanentes para arquivos pagos não existem.
- Imagens de capa são públicas e podem usar upload local (dev) ou Vercel Blob público.

## Pagamentos Pix

1. Crie uma aplicação no Mercado Pago e obtenha o Access Token (sandbox primeiro).
2. Configure a URL de webhook: `https://SEU_DOMINIO/api/webhooks/mercadopago`.
3. Copie o segredo de assinatura para `MERCADO_PAGO_WEBHOOK_SECRET`.
4. Informe `MERCADO_PAGO_COLLECTOR_ID` em produção para validar a conta recebedora.
5. Mantenha `MERCADO_PAGO_ENV=sandbox` até concluir os testes.

O servidor cria a cobrança com o total calculado no banco, valida valor/moeda/referência/ambiente na criação e novamente no webhook, consulta o pagamento diretamente no provedor e só então marca o pedido como pago e libera os acessos em transação.

## Segurança implementada

- Preços, descontos e totais sempre recalculados no servidor; o navegador envia apenas `productId`.
- Snapshot imutável de itens/preços em `OrderItem`.
- Idempotência de checkout por `checkoutKey` e de webhooks por eventos deduplicados no banco.
- Transações `Serializable` e locks consultivos para concorrência de cupom/pagamento.
- Webhook com HMAC SHA-256 e consulta server-to-server; JSON não é confiável por si só.
- CSRF por validação de origem + `SameSite=Lax` + content-type JSON.
- Rate limiting persistido no PostgreSQL (compartilhado entre instâncias).
- Autorização administrativa em toda rota (`requireAdminApi`, MFA verificado).
- IDOR/BOLA bloqueado em pedidos, downloads, carrinho e área do cliente.
- Senhas Argon2id; tokens de sessão/verificação armazenados apenas como hash.
- Uploads validados por extensão, assinatura binária e tamanho; nomes normalizados.
- CSP com nonce, HSTS, nosniff, frame-ancestors none, Referrer-Policy e Permissions-Policy.
- Logs de auditoria e de downloads; erros sem vazamento de detalhes sensíveis.

## Estrutura

```
prisma/            schema, migrations, seed e arquivos de exemplo
scripts/           bootstrap do administrador
src/app/           páginas (store/admin), rotas de API, SEO
src/components/    UI pública e administrativa
src/lib/           domínio: auth, pedidos, pagamentos, downloads, storage, segurança
tests/             unit, integration e e2e
```

## Pendências de configuração (obrigatórias para produção)

- [ ] PostgreSQL gerenciado (Neon) e migrations aplicadas
- [ ] `AUTH_SECRET` e `ENCRYPTION_KEY` fortes
- [ ] Vercel Blob privado + `BLOB_READ_WRITE_TOKEN`
- [ ] Credenciais Mercado Pago de produção, `COLLECTOR_ID` e webhook
- [ ] `APP_URL` com domínio HTTPS real
- [ ] Administrador criado com TOTP
- [ ] Dados comerciais/legais preenchidos no painel (CNPJ, endereço, suporte)
- [ ] Teste ponta a ponta em sandbox e depois com valor real mínimo
- [ ] Revisão jurídica dos termos, privacidade, reembolso e licenciamento

Consulte `DEPLOY_VERCEL.md` e `TEST_REPORT.md`.
