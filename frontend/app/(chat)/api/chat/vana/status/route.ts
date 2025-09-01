/**
 * GET /api/chat/vana/status
 * Health check endpoint for Vana backend availability
 */
export async function GET() {
  const vanaBaseUrl = process.env.VANA_BASE_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${vanaBaseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout for health checks
    });

    if (response.ok) {
      return Response.json({
        available: true,
        message: 'Vana backend is healthy',
      });
    } else {
      return Response.json({
        available: false,
        message: `Vana backend returned status ${response.status}`,
      }, { status: 503 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json({
      available: false,
      message: `Failed to connect to Vana backend: ${errorMessage}`,
    }, { status: 503 });
  }
}