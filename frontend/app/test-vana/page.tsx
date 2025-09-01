/**
 * Simple test page for Vana integration
 * No authentication required
 */

'use client';

import { useState, useEffect } from 'react';
import { vanaClient } from '@/lib/vana-client';

export default function TestVanaPage() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    // Check backend connection
    vanaClient.checkHealth()
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('error'));
  }, []);

  const testConnection = async () => {
    try {
      const healthy = await vanaClient.checkHealth();
      setResponse(`Backend health check: ${healthy ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Vana Integration Test</h1>
        
        {/* Backend Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Backend Connection Status</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 
              backendStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            } animate-pulse`} />
            <span className="text-lg">
              {backendStatus === 'connected' ? '✅ Connected to Vana Backend (port 8000)' :
               backendStatus === 'error' ? '❌ Cannot connect to backend' :
               '⏳ Checking connection...'}
            </span>
          </div>
          {backendStatus === 'error' && (
            <p className="text-sm text-red-600 mt-2">
              Make sure the backend is running: <code className="bg-red-100 px-1 rounded">python app/server.py</code>
            </p>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Test Backend Connection
          </button>
          
          {response && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <pre className="text-sm">{response}</pre>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Integration Info</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Frontend: Vercel Chat UI (Next.js)</li>
            <li>• Backend: Vana with Google ADK</li>
            <li>• Backend URL: http://localhost:8000</li>
            <li>• Frontend URL: http://localhost:3000</li>
            <li>• This page: http://localhost:3000/test-vana</li>
            <li>• Full chat: http://localhost:3000/vana</li>
          </ul>
        </div>
      </div>
    </div>
  );
}