import { NextRequest, NextResponse } from 'next/server';
import { processCSPViolation, type CSPReport } from '@/lib/csp';

/**
 * CSP Violation Reporting Endpoint
 * Handles violations reported by browsers when CSP policies are violated
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the CSP violation report
    const report: CSPReport = await request.json();
    
    // Log the violation (in development) or send to monitoring service (in production)
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 CSP Violation Report:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        report: report['csp-report']
      });
    } else {
      // In production, you might want to send this to your monitoring service
      // Example: await monitoringService.logCSPViolation(report);
      
      // For now, we'll log to console but you should replace this with your monitoring solution
      console.error('CSP Violation in Production:', {
        directive: report['csp-report']['violated-directive'],
        blockedUri: report['csp-report']['blocked-uri'],
        sourceFile: report['csp-report']['source-file'],
        timestamp: new Date().toISOString()
      });
    }
    
    // Process the violation using our utility function
    processCSPViolation(report);
    
    // Return success response
    return NextResponse.json({ status: 'received' }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing CSP violation report:', error);
    
    // Return error response
    return NextResponse.json(
      { error: 'Failed to process violation report' }, 
      { status: 400 }
    );
  }
}

/**
 * Health check endpoint for CSP reporting
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'csp-report',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle other HTTP methods
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}