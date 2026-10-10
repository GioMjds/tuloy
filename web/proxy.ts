import { type NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  // Implementation for proxying requests
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
