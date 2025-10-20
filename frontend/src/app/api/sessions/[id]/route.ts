import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE proxy for session deletion
 * Prevents CORS errors by proxying requests through Next.js server
 * Frontend calls: DELETE /api/sessions/{id}
 * Backend receives: DELETE /api/sessions/{id}
 *
 * Next.js 15: params is now async
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const backendUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';

  try {
    const response = await fetch(`${backendUrl}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'X-CSRF-Token': request.headers.get('X-CSRF-Token') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[DELETE Session Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
