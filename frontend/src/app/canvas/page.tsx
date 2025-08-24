'use client';

import { CanvasDemo } from '@/components/canvas/canvas-demo';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function CanvasPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <CanvasDemo />
    </ProtectedRoute>
  );
}