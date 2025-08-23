export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 text-blue-400">
            Vana
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Virtual Autonomous Network Agent - Your AI-powered assistant for coding, analysis, and automation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Next.js 15</h3>
              <p className="text-gray-400">Built with the latest Next.js App Router</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">TypeScript</h3>
              <p className="text-gray-400">Type-safe development with strict mode</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Foundation</h3>
              <p className="text-gray-400">Sprint 1 - Project Bootstrap Complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
