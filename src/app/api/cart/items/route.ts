import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";
import { addProductToCart, getCartSummary } from "@/lib/cart";
import { rateLimitByIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ productId: z.string().min(10).max(60) });

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await getCurrentUser();
    await rateLimitByIp(request.headers, "cart:add", 60, 300, user?.id ?? "guest");
    const body = schema.parse(await readJson(request));
    const result = await addProductToCart(user?.id ?? null, body.productId);
    return jsonOk({ count: result.count, message: "Produto adicionado ao carrinho." });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const summary = await getCartSummary(user?.id ?? null);
    return jsonOk({ cart: summary });
  } catch (error) {
    return errorResponse(error);
  }
}
