import { NextResponse } from 'next/server';

export async function GET() {
  // Skip health check during build
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME) {
    return NextResponse.json(
      { status: 'offline', last_check: null },
      { status: 200 }
    );
  }

  try {
    // Try to fetch from the MCP server health endpoint
    const response = await fetch('http://kanban-mcp-server:8080/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Use a shorter timeout for health checks
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { status: 'offline', last_check: null },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('MCP health check failed:', error);
    // Return offline status if we can't reach the MCP server
    return NextResponse.json(
      { status: 'offline', last_check: null },
      { status: 503 }
    );
  }
}