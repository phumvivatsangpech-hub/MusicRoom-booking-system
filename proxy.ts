import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoginPage = req.nextUrl.pathname === "/login"

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}