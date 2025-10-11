import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ThemeProvider } from '@/components/providers/theme-provider'

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased h-screen overflow-hidden font-sans">
        <ThemeProvider defaultTheme="system" storageKey="vana-ui-theme">
          <ErrorBoundary
            componentName="RootLayout"
            showHomeButton={true}
            allowRetry={true}
            showErrorDetails={true}
          >
            <SidebarProvider>{children}</SidebarProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
