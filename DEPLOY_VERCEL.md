# Deploy na Vercel — passo a passo

Este guia parte do projeto já instalado localmente e testado.

## 1. Criar o banco no Neon

1. Crie um projeto no Neon (PostgreSQL 16).
2. Copie a **connection string com pooling** (`...-pooler...`) e mantenha `sslmode=require`.
3. Guarde também a conexão direta para rodar migrations, se necessário.

Ajuste no `.env` local antes das migrations:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require"
```

Aplique o schema e o conteúdo inicial:

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

O seed cria categorias, seis produtos demonstrativos, arquivos privados, o cupom `BEMVINDO10` e as configurações padrão. Ele pode ser omitido se você for cadastrar tudo pelo painel.

## 2. Criar o Vercel Blob privado

1. No painel da Vercel, abra o projeto (ou crie um vazio) e vá em **Storage → Blob**.
2. Crie um store e copie o `BLOB_READ_WRITE_TOKEN`.
3. Defina `STORAGE_DRIVER=vercel-blob`.
4. Envie os arquivos dos produtos pelo painel (`/admin/produtos/[id]` → Arquivos). Arquivos novos irão para o Blob privado.

> O armazenamento local serve apenas para desenvolvimento. Em produção serverless os arquivos precisam do Blob.

## 3. Configurar o Mercado Pago (Pix)

1. Acesse o Mercado Pago Developers e crie uma aplicação.
2. Em **Credenciais**, copie o Access Token da aplicação (comece em modo teste/sandbox).
3. Copie também o **Collector ID** da conta recebedora.
4. Em **Webhooks → Configuração**, cadastre:
   - URL: `https://SEU_DOMINIO/api/webhooks/mercadopago`
   - Eventos: `payment`
5. Copie o **segredo secreto** exibido para assinatura e use como `MERCADO_PAGO_WEBHOOK_SECRET`.
6. Para sandbox, use as credenciais de teste e `MERCADO_PAGO_ENV=sandbox`. Para dinheiro real, troque para as credenciais de produção e `MERCADO_PAGO_ENV=production`.

### Teste em sandbox

1. Publique com `MERCADO_PAGO_ENV=sandbox`.
2. Cadastre um usuário de teste comprador no Mercado Pago e use as credenciais do vendedor de teste.
3. Faça uma compra e pague o Pix de teste.
4. Verifique a página do pedido: deve virar **Pago** e o arquivo aparecer na biblioteca.
5. No painel administrativo, confira o pedido e o log de auditoria.
6. Teste também webhook duplicado, pedido pendente e conciliação manual.

## 4. Configurar variáveis na Vercel

Em **Project → Settings → Environment Variables**, cadastre para Production (e Preview quando fizer sentido):

```
DATABASE_URL
APP_URL=https://seu-dominio.com
AUTH_SECRET
ENCRYPTION_KEY
STORAGE_DRIVER=vercel-blob
BLOB_READ_WRITE_TOKEN
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_WEBHOOK_SECRET
MERCADO_PAGO_COLLECTOR_ID
MERCADO_PAGO_ENV=production
RESEND_API_KEY (opcional)
EMAIL_FROM
REQUIRE_EMAIL_VERIFICATION
```

- `APP_URL` deve ser exatamente o domínio público com HTTPS, sem barra final. Ele é usado na validação de origem (CSRF), webhook e links.
- Não suba `.env` para o repositório. Use apenas o painel da Vercel.
- Gere `AUTH_SECRET` com `openssl rand -base64 48` e `ENCRYPTION_KEY` com `openssl rand -base64 32`.

## 5. Deploy

```bash
npm run build
vercel --prod
```

Ou conecte o repositório na Vercel. O comando de build deve ser `npm run build`; o Next.js detecta o App Router automaticamente. Não é necessário `prisma generate` separado em produção se o `postinstall` do Prisma estiver disponível (a Vercel executa `npm install`).

Se o build falhar por falta de banco em páginas dinâmicas, confirme que as variáveis estão no ambiente de Build e Production. As rotas da loja são dinâmicas e os fallbacks de layout não exigem banco em tempo de build.

## 6. Criar o administrador em produção

Execute localmente com a `DATABASE_URL` de produção:

```bash
DATABASE_URL="postgresql://...neon...?sslmode=require" \
ADMIN_EMAIL="admin@seudominio.com" \
ADMIN_NAME="Administrador" \
ADMIN_PASSWORD="SenhaForte#2026" \
npm run bootstrap:admin
```

Guarde o segredo TOTP exibido em local seguro. A conta já nasce com MFA habilitado; o primeiro login pede senha + código. Não existe senha padrão pública.

## 7. Domínio, webhook e cookies

1. Configure o domínio em **Settings → Domains**.
2. Atualize `APP_URL` para o domínio final e faça um novo deploy.
3. Atualize a URL do webhook no Mercado Pago.
4. Cookies de sessão usam `Secure` automaticamente quando `NODE_ENV=production`.

## 8. Checklist antes de receber dinheiro real

- [ ] Migrations aplicadas no banco de produção
- [ ] Seed/administrador criados e dados comerciais preenchidos no painel
- [ ] `APP_URL` HTTPS e domínio corretos
- [ ] Webhook do Mercado Pago apontando para o domínio final
- [ ] `MERCADO_PAGO_ENV=production` e credenciais de produção
- [ ] `MERCADO_PAGO_COLLECTOR_ID` da conta recebedora correta
- [ ] `BLOB_READ_WRITE_TOKEN` do store privado
- [ ] Compra real de valor mínimo validada (pedido PENDING → PAID → download)
- [ ] Webhook duplicado e conciliação testados
- [ ] Reembolso/estorno revoga acesso (testado em sandbox)
- [ ] Termos, privacidade, reembolso, licenciamento e contato revisados
- [ ] Suporte e e-mail transacional configurados

## Observações de segurança operacional

- Nunca reutilize o banco de desenvolvimento em produção.
- Nunca registre tokens ou segredos em logs. O projeto não imprime credenciais.
- Se rotacionar o webhook secret ou o access token, atualize as variáveis e faça redeploy.
- O endpoint `/api/health` pode ser usado em monitoramento (não expõe segredos).
