import { appUrl } from "@/lib/env";

export class CsrfError extends Error {
  constructor() {
    super("Origem da requisição não autorizada.");
    this.name = "CsrfError";
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "cross-site") throw new CsrfError();
    return;
  }

  let expected: URL;
  let received: URL;
  try {
    expected = new URL(appUrl());
    received = new URL(origin);
  } catch {
    throw new CsrfError();
  }

  if (expected.origin !== received.origin) throw new CsrfError();
}

export function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new CsrfError();
  }
  assertSameOrigin(request);
}
