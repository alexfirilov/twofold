import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/',
  '/admin',
]

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/signup',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('firebase-session')

  // Check if user has a Firebase session cookie (basic check)
  // Full Firebase token verification will happen in API routes
  const hasSessionCookie = !!sessionCookie?.value

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') || 
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // Handle auth pages (redirect if already authenticated)  
  if (pathname === '/login' || pathname === '/signup') {
    if (hasSessionCookie) {
      const from = request.nextUrl.searchParams.get('from')
      const redirectUrl = new URL(from || '/', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Handle admin route (require authentication)
  if (pathname === '/admin') {
    if (!hasSessionCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // For root path, let the client-side handle authentication
  // This prevents redirect loops during auth state transitions

  // Add security headers
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Match only specific routes that need protection
     */
    '/',
    '/admin',
    '/login',
    '/signup',
    // Add support for corner routes
    '/corner/:path*',
  ],
}