import { NextResponse, type NextRequest } from "next/server";

// The admin area is only ever shown in English, whatever language the visitor
// picked for the shop. This tells src/i18n/server.ts so, for pages and server
// actions alike.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-locale", "en");

  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*"] };
