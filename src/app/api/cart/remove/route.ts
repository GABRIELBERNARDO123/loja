import { z } from "zod";
import { assertJsonRequest } from "@/lib/security/csrf";
import { errorResponse, jsonOk, readJson } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartSummary, removeCartItem } from "@/lib/cart";

export const runtime = "nodejs";

const schema = z.object({ productId: z.string().min(10).max(60) });

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const user = await getCurrentUser();
    const body = schema.parse(await readJson(request));
    await removeCartItem(user?.id ?? null, body.productId);
    const summary = await getCartSummary(user?.id ?? null);
    return jsonOk({ count: summary.itemCount, message: "Produto removido do carrinho." });
  } catch (error) {
    return errorResponse(error);
  }
}
