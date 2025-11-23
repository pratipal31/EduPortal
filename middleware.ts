// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
]);

// Define routes that should bypass role-based redirection
const isApiRoute = createRouteMatcher(['/api(.*)']);
const isPageRoute = createRouteMatcher(['/pages-Teacher(.*)', '/pages-Student(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all non-public routes
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Skip role-based redirection for API routes and page routes
  if (isApiRoute(req) || isPageRoute(req)) {
    return NextResponse.next();
  }

  // Handle dashboard redirection based on role
  if (req.nextUrl.pathname === '/dashboard') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return NextResponse.next();
      }

      if (data?.role === 'teacher') {
        return NextResponse.redirect(new URL('/pages-Teacher/TeacherDashboard', req.url));
      } else if (data?.role === 'student') {
        return NextResponse.redirect(new URL('/pages-Student/StudentDashboard', req.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Run for dashboard
    '/dashboard',
  ],
};