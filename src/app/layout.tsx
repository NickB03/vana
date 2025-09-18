import type { Metadata } from "next";
import "./globals.css";
import { VanaSidebar } from "@/components/vana/VanaSidebar";

export const metadata: Metadata = {
  title: "Vana - Virtual Autonomous Network Agent",
  description: "Your AI assistant for research, analysis, and creative work using coordinated multi-agent intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased h-screen overflow-hidden font-sans">
        {/* Layout-First Architecture: Persistent Sidebar + Conditional Chat */}
        <div className="flex h-full">
          {/* Persistent Sidebar - Always Rendered */}
          <aside className="w-64 border-r bg-background flex-shrink-0">
            <VanaSidebar />
          </aside>
          
          {/* Main Content Area - Conditional Rendering */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}