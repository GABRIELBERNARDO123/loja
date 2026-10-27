# Relatório de testes — Vértice Digital

Data da execução: 2026-10-27  
Ambiente: Ubuntu 24.04, Node.js 20.20.2, PostgreSQL 16 (container local), Chromium via Playwright.

## Resultado executivo

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | **PASSOU** — 0 erros, 0 avisos |
| Typecheck | `npm run typecheck` | **PASSOU** |
| Testes unitários/integração | `npm test` | **PASSOU** — 6 arquivos, 50 testes |
| Build de produção | `npm run build` | **PASSOU** |
| E2E Playwright | `npx playwright test` | **PASSOU** — 8 testes |
| Auditoria de dependências | `npm audit` | **0 vulnerabilidades** |

## Cobertura funcional dos testes

### Unitários

- Hash Argon2id: senha correta aceita, senha incorreta recusada.
- Política de senha.
- Assinatura HMAC de webhook: válida, segredo errado, id alterado, segredo ausente.
- Validação de pagamento: valor manipulado para zero, moeda, referência de outro pedido, conta recebedora, ambiente sandbox/produção.
- Upload: PDF válido, extensão permitida com conteúdo falso, extensão proibida, arquivo vazio, nome/Content-Disposition.
- Precificação server-side: preço oficial, percentual, teto de desconto, total nunca negativo, cupom expirado, limite global, reutilização por cliente, compra mínima, desconto fixo/percentual, quantidade normalizada.

### Integração

- Criação de pedido ignora `total`, `totalCents`, `amount`, `price` e `subtotalCents` manipulados no payload (cenário R$ 14,90 → R$ 0,00).
- Cupom válido aplicado no servidor e resgate contabilizado.
- Cupom inexistente e cupom 100% recusados sem pedido gratuito.
- Idempotência de checkout (mesma chave não duplica pedido).
- Concorrência em cupom com limite global.
- Pagamento aprovado e validado cria acessos; valor zero/divergente não libera pedido.
- Webhook duplicado não duplica entitlements.
- Referência de pedido de outra compra é recusada.
- Estorno/reembolso revoga downloads.
- Evento de pedido inexistente é registrado sem alterar pedidos.
- Tokens de verificação: consumo único, tipo errado, expiração, invalidação do anterior.
- Download: comprador autorizado, IDOR/BOLA (outro usuário → 404), pedido não pago (403), revogado/expirado (403), limite atômico de downloads (429) e incremento.
- Pedido de outro cliente não é retornado por `getOrderForUser`.

### E2E (Chromium, desktop e viewport mobile 390×844)

- Home carrega, identidade visual, navegação para o catálogo e rodapé.
- Catálogo com pesquisa, ordenação e produtos.
- Página de produto exibe preço, adiciona ao carrinho e o item aparece no carrinho.
- Visitante em `/admin` é redirecionado para login com `next=/admin`.
- Login inválido retorna mensagem genérica (sem enumeração de conta).
- API administrativa recusa POST sem sessão/MFA (401/403).
- Layout mobile sem rolagem horizontal na home e no catálogo.
- Administrador autentica com senha + TOTP e acessa o painel.
- Criação e edição de produto pela API administrativa autenticada (inclui auditoria).

## Testes executados em fluxo real de servidor

- Smoke HTTP: `/`, `/produtos`, `/produto/[slug]`, `/carrinho`, `/entrar`, `/criar-conta`, `/paginas/termos` → 200.
- Página inexistente → 404.
- CSP com nonce aplicada aos scripts; nenhum erro de CSP no console nas páginas válidas.
- Health check `/api/health` (verificado manualmente com banco ativo).

## Falhas encontradas e corrigidas durante a validação

1. **Login inválido retornava HTTP 500** em vez de 401 por retorno incorreto no fluxo de erro. Corrigido para `401` com mensagem genérica.
2. **Página 404 tinha scripts bloqueados pela CSP com nonce** por ser pré-renderizada estaticamente. Corrigida para renderização dinâmica; scripts agora recebem nonce.
3. **Overflow horizontal no catálogo mobile** causado pelos selects de filtro. Corrigido com wrap e largura flexível.
4. **Pós-login de administrador caía em `/conta`** em vez de `/admin` quando não havia `next` explícito. Corrigido o fluxo de redirecionamento.
5. **Dependências vulneráveis** (postcss, zod, tinypool, deepmerge-ts) atualizadas/substituídas via `overrides`; `npm audit` passou a reportar 0 vulnerabilidades.

## Não testado nesta execução (e por quê)

| Item | Situação | Motivo |
| --- | --- | --- |
| Pagamento Pix real/sandbox no Mercado Pago | **PENDENTE DE CONFIGURAÇÃO** | Sem credenciais reais/sandbox no ambiente. Integração e validações estão implementadas e testadas com mocks. |
| Webhook HTTP ponta a ponta do Mercado Pago | **PENDENTE DE CONFIGURAÇÃO** | Requer URL pública e segredo reais; a assinatura e o processamento foram testados unitariamente/integração. |
| Upload/download no Vercel Blob | **PENDENTE DE CONFIGURAÇÃO** | Requer `BLOB_READ_WRITE_TOKEN`; o driver local e a validação de upload foram testados. |
| Envio real de e-mail (Resend) | **PENDENTE DE CONFIGURAÇÃO** | Sem `RESEND_API_KEY`; em desenvolvimento os e-mails vão para outbox local. |
| Deploy na Vercel | **NÃO EXECUTADO** | Publicação exige conta e confirmação do proprietário. |
| Compra real com dinheiro | **NÃO EXECUTADA** | Requer autorização explícita e credenciais de produção. |
| Teste de carga | **NÃO EXECUTADO** | Fora do escopo desta entrega. |

## Observação importante

Compilação, testes automatizados e auditoria de dependências **não substituem** a homologação com o provedor de pagamentos. Antes de receber dinheiro real, execute o checklist de `DEPLOY_VERCEL.md`, faça uma compra de valor mínimo em produção e confirme: pedido pago, valor exato, conta recebedora correta, acesso liberado, download funcionando e revogação em caso de estorno.
