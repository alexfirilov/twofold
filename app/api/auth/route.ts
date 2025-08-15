import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit'

/**
 * POST /api/auth - Create session from Firebase ID token
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for session creation
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`auth_post_${clientId}`, RATE_LIMITS.AUTH_MODERATE);
    
    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.resetTime);
      return NextResponse.json(
        { 
          error: 'Too many authentication attempts. Please try again later.',
          resetTime: resetDate.toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': resetDate.toISOString(),
          }
        }
      )
    }
    
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      )
    }

    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    // Create session cookie that expires in 7 days
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Create the response
    const response = NextResponse.json(
      { success: true, message: 'Session created successfully' },
      { status: 200 }
    )

    // Set the cookie on the response
    response.cookies.set('firebase-session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000, // Convert to seconds
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth - Logout and clear session
 */
export async function DELETE(request: NextRequest) {
  try {
    // Light rate limiting for logout (more permissive)
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`auth_delete_${clientId}`, RATE_LIMITS.AUTH_LENIENT);
    
    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.resetTime);
      return NextResponse.json(
        { 
          error: 'Too many logout attempts. Please try again later.',
          resetTime: resetDate.toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          }
        }
      )
    }

    const response = NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    )

    // Clear all possible session cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    };

    response.cookies.set('firebase-session', '', cookieOptions);
    // Also clear any legacy cookies that might exist
    response.cookies.set('session', '', cookieOptions);
    response.cookies.set('auth-token', '', cookieOptions);
    response.cookies.set('our-corner-session', '', cookieOptions);

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth - Check authentication status and return user info
 */
export async function GET(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    const sessionCookie = request.cookies.get('firebase-session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    // Verify session cookie with Firebase Admin
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie)
    
    // Get user data from Firebase Auth
    const userRecord = await adminAuth.getUser(decodedClaims.uid)
    
    const user = {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
    }

    return NextResponse.json(
      { 
        authenticated: true, 
        user
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    )
  }
}