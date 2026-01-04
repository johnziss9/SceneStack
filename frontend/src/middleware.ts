import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If trying to access protected route without token, redirect to login
    if (!isPublicRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated and trying to access login/register, redirect to home
    if (token && (pathname === '/login' || pathname === '/register')) {
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};