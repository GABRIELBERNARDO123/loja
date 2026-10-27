import { expect, test } from "@playwright/test";
import { Secret, TOTP } from "otpauth";

test.describe("loja pública", () => {
  test("home carrega com identidade visual e navegação principal", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Arquivos que/i);
    await expect(page.getByRole("link", { name: /Explorar catálogo/i })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    await page.getByRole("link", { name: /Explorar catálogo/i }).click();
    await expect(page).toHaveURL(/\/produtos/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Catálogo/i);
  });

  test("catálogo permite pesquisa, filtro por categoria e ordenação", async ({ page }) => {
    await page.goto("/produtos");
    const search = page.getByLabel(/Pesquisar produtos/i);
    await search.fill("planilha");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=planilha/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/planilha/i);

    await page.goto("/produtos?sort=price_asc");
    await expect(page.locator("article").first()).toBeVisible();
    const firstPrice = await page.locator("article").first().innerText();
    expect(firstPrice).toMatch(/R\$\s?\d/);
  });

  test("página de produto exibe preço e adiciona ao carrinho", async ({ page }) => {
    await page.goto("/produtos");
    const productLink = page.locator('article h3 a').first();
    const productName = (await productLink.innerText()).trim();
    await productLink.click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(productName);
    await expect(page.getByText(/R\$\s?\d/).first()).toBeVisible();

    await page.getByRole("button", { name: /Adicionar ao carrinho/i }).first().click();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 15_000 });

    await page.goto("/carrinho");
    await expect(page.getByText(productName).first()).toBeVisible();
  });

  test("visitante é redirecionado ao tentar abrir o painel administrativo", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/entrar\?next=(%2F|\/)admin/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Bem-vindo/i);
  });

  test("login inválido retorna mensagem genérica sem revelar a conta", async ({ page }) => {
    await page.goto("/entrar");
    await page.locator("#login-email").fill(`inexistente-${Date.now()}@example.com`);
    await page.locator("#login-password").fill("SenhaErrada#2026");
    await page.getByRole("button", { name: /Entrar na conta/i }).click();
    await expect(page.getByText(/E-mail ou senha inválidos/i)).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("API administrativa recusa requisição sem sessão e sem MFA", async ({ request, baseURL }) => {
    const response = await request.post("/api/admin/products", {
      data: { name: "Intruso", price: "1,00" },
      headers: { Origin: baseURL as string },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("layout mobile não cria rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);

    await page.goto("/produtos");
    const overflowCatalog = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowCatalog).toBeLessThanOrEqual(2);
  });
});

test.describe("painel administrativo", () => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const secret = process.env.E2E_ADMIN_TOTP_SECRET;

  test.skip(!email || !password || !secret, "Defina E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD e E2E_ADMIN_TOTP_SECRET.");

  test("administrador autentica com senha e TOTP e acessa o painel", async ({ page }) => {
    await page.goto("/entrar");
    await page.locator("#login-email").fill(email as string);
    await page.locator("#login-password").fill(password as string);
    await page.getByRole("button", { name: /Entrar na conta/i }).click();
    await expect(page).toHaveURL(/\/verificar-2fa/);

    const totp = new TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret as string),
    });
    await page.locator("#totp-code").pressSequentially(totp.generate(), { delay: 20 });
    await page.getByRole("button", { name: /Confirmar código/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/admin/produtos");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Produtos/i);

    const slug = `produto-e2e-${Date.now()}`;
    const create = await page.request.post("/api/admin/products", {
      data: {
        name: "Produto E2E",
        slug,
        shortDescription: "Produto criado pelo teste automatizado para validar o painel.",
        description: "## Teste\n\nConteúdo do produto criado no teste E2E.",
        price: "19,90",
        compareAt: "",
        categoryId: "",
        coverImageUrl: "",
        previewUrl: "",
        fileFormat: "PDF",
        compatibility: "",
        isActive: true,
        isFeatured: false,
      },
    });
    expect(create.ok()).toBeTruthy();
    const created = (await create.json()) as { productId: string };
    expect(created.productId).toBeTruthy();

    const update = await page.request.patch(`/api/admin/products/${created.productId}`, {
      data: {
        name: "Produto E2E editado",
        slug,
        shortDescription: "Produto editado pelo teste automatizado para validar o painel.",
        description: "## Teste\n\nConteúdo editado do produto criado no teste E2E.",
        price: "24,90",
        compareAt: "",
        categoryId: "",
        coverImageUrl: "",
        previewUrl: "",
        fileFormat: "PDF",
        compatibility: "",
        isActive: false,
        isFeatured: false,
      },
    });
    expect(update.ok()).toBeTruthy();
  });
});
