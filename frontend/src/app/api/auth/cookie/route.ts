/**
 * Cookie Management API Route
 * Handles httpOnly cookie operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, key, value, options } = body;
    
    const cookieStore = await cookies();
    
    switch (action) {
      case 'set': {
        if (!key || value === undefined) {
          return NextResponse.json(
            { error: 'Key and value are required for set action' },
            { status: 400 }
          );
        }
        
        const cookieOptions = {
          ...COOKIE_OPTIONS,
          ...options,
          maxAge: options?.maxAge || 3600 // Default 1 hour
        };
        
        cookieStore.set(key, value, cookieOptions);
        
        return NextResponse.json({ success: true });
      }
      
      case 'get': {
        if (!key) {
          return NextResponse.json(
            { error: 'Key is required for get action' },
            { status: 400 }
          );
        }
        
        const cookie = cookieStore.get(key);
        
        return NextResponse.json({
          success: true,
          value: cookie?.value || null
        });
      }
      
      case 'remove': {
        if (!key) {
          return NextResponse.json(
            { error: 'Key is required for remove action' },
            { status: 400 }
          );
        }
        
        cookieStore.delete(key);
        
        return NextResponse.json({ success: true });
      }
      
      case 'clear': {
        // Clear all secure cookies
        const allCookies = cookieStore.getAll();
        allCookies.forEach(cookie => {
          if (cookie.name.startsWith('__secure_') || 
              cookie.name.startsWith('__session_') ||
              cookie.name.startsWith('access_') ||
              cookie.name.startsWith('id_') ||
              cookie.name.startsWith('refresh_')) {
            cookieStore.delete(cookie.name);
          }
        });
        
        return NextResponse.json({ success: true });
      }
      
      case 'list': {
        // List all secure cookies (keys only, not values)
        const allCookies = cookieStore.getAll();
        const secureCookies = allCookies
          .filter(cookie => 
            cookie.name.startsWith('__secure_') || 
            cookie.name.startsWith('__session_'))
          .map(cookie => cookie.name);
        
        return NextResponse.json({
          success: true,
          cookies: secureCookies
        });
      }
      
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cookie operation error:', error);
    return NextResponse.json(
      { error: 'Cookie operation failed' },
      { status: 500 }
    );
  }
}