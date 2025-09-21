import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from '@/components/ui/sidebar'

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
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  );
}
