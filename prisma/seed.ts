import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { savePrivateFile } from "../src/lib/storage";
import { defaultSettingsData } from "../src/lib/settings";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Planilhas", slug: "planilhas", description: "Controles, calculadoras e modelos em planilha para organizar rotinas e decisões.", sortOrder: 1 },
  { name: "Documentos", slug: "documentos", description: "Modelos prontos para propostas, contratos e rotinas administrativas.", sortOrder: 2 },
  { name: "Marketing", slug: "marketing", description: "Materiais de apoio para planejamento, lançamentos e presença digital.", sortOrder: 3 },
  { name: "Finanças", slug: "financas", description: "Ferramentas para organizar receitas, despesas e precificação.", sortOrder: 4 },
  { name: "Templates", slug: "templates", description: "Arquivos editáveis para apresentações e projetos.", sortOrder: 5 },
];

type SeedProduct = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  categorySlug: string;
  fileFormat: string;
  compatibility: string;
  isFeatured: boolean;
  sortOrder: number;
  assets: Array<{ file: string; mime: string }>;
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Planilha de Controle Financeiro Pessoal",
    slug: "planilha-controle-financeiro-pessoal",
    shortDescription: "Organize receitas, despesas e saldo mensal em uma planilha clara, pronta para personalizar.",
    description: `## O que está incluído

- Planilha editável para acompanhar receitas, despesas fixas e variáveis
- Estrutura de categorias pronta para adaptar à sua realidade
- Linhas de exemplo para facilitar a configuração
- Arquivo demonstrativo seguro, sem fórmulas ocultas ou macros

## Como usar

1. Abra o arquivo em um aplicativo compatível.
2. Substitua as linhas de exemplo pelos seus lançamentos.
3. Atualize os valores periodicamente e acompanhe a diferença entre previsto e realizado.

> Este é um arquivo demonstrativo. Personalize as categorias e os campos conforme a sua necessidade.`,
    priceCents: 1490,
    compareAtCents: 2990,
    categorySlug: "financas",
    fileFormat: "XLSX",
    compatibility: "Excel 2016+, Google Sheets, LibreOffice Calc",
    isFeatured: true,
    sortOrder: 1,
    assets: [{ file: "controle-financeiro.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }],
  },
  {
    name: "Kit de Documentos Profissionais",
    slug: "kit-documentos-profissionais",
    shortDescription: "Modelos de proposta e contrato em DOCX e PDF para padronizar seus documentos comerciais.",
    description: `## O que está incluído

- Modelo de proposta comercial em DOCX
- Versão em PDF para referência
- Estrutura de seções para escopo, prazo, valores e condições
- Texto demonstrativo para adaptação

## Indicado para

Profissionais que precisam padronizar documentos comerciais e reduzir o tempo de elaboração.

## Observação

Os modelos são demonstrativos e não substituem análise jurídica. Revise cláusulas, dados e condições antes de usar.`,
    priceCents: 1990,
    categorySlug: "documentos",
    fileFormat: "DOCX + PDF",
    compatibility: "Microsoft Word, Google Docs, LibreOffice, leitores de PDF",
    isFeatured: true,
    sortOrder: 2,
    assets: [
      { file: "kit-documentos.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { file: "kit-documentos.pdf", mime: "application/pdf" },
    ],
  },
  {
    name: "Checklist de Lançamento Digital",
    slug: "checklist-lancamento-digital",
    shortDescription: "Checklist objetivo para revisar as etapas essenciais antes de publicar uma oferta digital.",
    description: `## O que está incluído

- PDF com etapas de planejamento, materiais, pagamento e suporte
- Estrutura sequencial para revisão antes da publicação
- Linguagem direta, sem promessas de resultado

## Como usar

Percorra cada item e confirme o que já está pronto. Use o checklist como apoio de revisão, adaptando etapas ao seu contexto.`,
    priceCents: 990,
    categorySlug: "marketing",
    fileFormat: "PDF",
    compatibility: "Qualquer leitor de PDF",
    isFeatured: true,
    sortOrder: 3,
    assets: [{ file: "checklist-lancamento.pdf", mime: "application/pdf" }],
  },
  {
    name: "Planilha de Precificação de Serviços",
    slug: "planilha-precificacao-servicos",
    shortDescription: "Calcule custos, margem e preço sugerido para serviços com uma estrutura simples e editável.",
    description: `## O que está incluído

- Planilha com campos de custo, margem e preço sugerido
- Exemplos para hora técnica e projetos
- Arquivo CSV complementar com modelo de dados

## Como usar

Preencha seus custos reais, defina a margem desejada e use o preço sugerido como ponto de partida. Ajuste conforme o mercado e o escopo do serviço.

> Os exemplos são ilustrativos e não constituem recomendação financeira.`,
    priceCents: 1790,
    compareAtCents: 2490,
    categorySlug: "planilhas",
    fileFormat: "XLSX + CSV",
    compatibility: "Excel 2016+, Google Sheets, LibreOffice Calc",
    isFeatured: false,
    sortOrder: 4,
    assets: [
      { file: "precificacao-servicos.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { file: "modelo-dados.csv", mime: "text/csv" },
    ],
  },
  {
    name: "Guia de Organização Financeira",
    slug: "guia-organizacao-financeira",
    shortDescription: "Guia em PDF com princípios práticos para organizar receitas, despesas e reservas.",
    description: `## O que está incluído

- PDF demonstrativo com orientações de organização financeira
- Sugestão de rotina semanal de revisão
- Pontos de atenção para metas e reservas

## Aviso

Conteúdo educacional demonstrativo. Não constitui consultoria financeira, recomendação de investimento ou garantia de resultados.`,
    priceCents: 1290,
    categorySlug: "financas",
    fileFormat: "PDF",
    compatibility: "Qualquer leitor de PDF",
    isFeatured: false,
    sortOrder: 5,
    assets: [{ file: "guia-organizacao.pdf", mime: "application/pdf" }],
  },
  {
    name: "Pack de Templates para Apresentações",
    slug: "pack-templates-apresentacoes",
    shortDescription: "Estruturas de slides em arquivos de texto editáveis para montar apresentações com clareza.",
    description: `## O que está incluído

- Arquivo ZIP com roteiros de slides
- Estrutura de contexto, problema, solução e próximos passos
- Arquivo LEIA-ME com orientações de uso

## Como usar

Importe ou copie o conteúdo para a ferramenta de apresentação de sua preferência e aplique a identidade visual do seu projeto.`,
    priceCents: 2490,
    categorySlug: "templates",
    fileFormat: "ZIP",
    compatibility: "Qualquer editor de texto / ferramenta de apresentação",
    isFeatured: false,
    sortOrder: 6,
    assets: [{ file: "templates-apresentacao.zip", mime: "application/zip" }],
  },
];

async function main() {
  for (const [name, description] of [
    ["ADMIN", "Administrador da loja"],
    ["CUSTOMER", "Cliente da loja"],
  ] as const) {
    await prisma.role.upsert({
      where: { name },
      create: { name, description },
      update: {},
    });
  }

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    create: defaultSettingsData,
    update: {},
  });

  const categoryMap = new Map<string, string>();
  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { ...category, isActive: true },
      update: {},
    });
    categoryMap.set(record.slug, record.id);
  }

  for (const product of PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
      include: { files: true },
    });

    let productId = existing?.id;
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents ?? null,
          categoryId: categoryMap.get(product.categorySlug) ?? null,
          fileFormat: product.fileFormat,
          compatibility: product.compatibility,
          isFeatured: product.isFeatured,
          sortOrder: product.sortOrder,
          isActive: true,
          downloadLimit: 10,
          downloadExpiryDays: 365,
        },
      });
      productId = created.id;
      console.log(`Produto criado: ${created.name}`);
    }

    if (!productId) continue;
    const hasFiles = existing?.files.length ?? 0;
    if (hasFiles > 0) continue;

    for (const asset of product.assets) {
      const buffer = await readFile(path.join(process.cwd(), "prisma", "seed-assets", asset.file));
      const pathname = await savePrivateFile({
        productId,
        extension: asset.file.split(".").pop() ?? "txt",
        buffer,
        contentType: asset.mime,
      });
      const { createHash } = await import("node:crypto");
      await prisma.productFile.create({
        data: {
          productId,
          pathname,
          originalName: asset.file,
          mimeType: asset.mime,
          sizeBytes: buffer.length,
          sha256: createHash("sha256").update(buffer).digest("hex"),
        },
      });
      console.log(`  Arquivo privado: ${asset.file}`);
    }
  }

  await prisma.coupon.upsert({
    where: { code: "BEMVINDO10" },
    create: {
      code: "BEMVINDO10",
      description: "10% de desconto para a primeira compra",
      type: "PERCENT",
      value: 10,
      minSubtotalCents: 0,
      maxDiscountCents: 1000,
      perUserLimit: 1,
      isActive: true,
    },
    update: {},
  });

  console.log("Seed concluído.");
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
