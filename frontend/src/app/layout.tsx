import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getNonce } from "@/lib/csp";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vana - Virtual Autonomous Network Agent",
  description: "Your AI-powered assistant for coding, analysis, and automation. Built with Next.js and powered by advanced AI capabilities.",
  keywords: ["AI", "Assistant", "Automation", "Coding", "Analysis"],
  authors: [{ name: "Vana Team" }],
  openGraph: {
    title: "Vana - Virtual Autonomous Network Agent",
    description: "Your AI-powered assistant for coding, analysis, and automation.",
    type: "website",
  },
  twitter: {
    title: "Vana - Virtual Autonomous Network Agent",
    description: "Your AI-powered assistant for coding, analysis, and automation.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#131314" },
    ],
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce();
  
  return (
    <html lang="en" className="dark" suppressHydrationWarning style={{ colorScheme: 'dark' }}>
      <head>
        {/* CSP nonce meta tag for client-side access */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        
        {/* Accessibility meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#131314" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`} suppressHydrationWarning>
        {/* Skip to main content link for keyboard users */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        
        {children}
        
        {/* Toast notifications */}
        <Toaster />
        
        {/* CSP-compliant theme initialization script */}
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // SSR-safe theme detection and initialization with accessibility
                (function() {
                  try {
                    // Check if we're in a browser environment
                    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                      const theme = localStorage.getItem('theme') || 'dark';
                      document.documentElement.className = theme;
                      
                      // Update theme-color meta tag dynamically
                      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
                      if (themeColorMeta) {
                        themeColorMeta.setAttribute('content', theme === 'dark' ? '#131314' : '#ffffff');
                      }
                      
                      // Announce theme change to screen readers
                      if (window.speechSynthesis) {
                        const announcement = document.createElement('div');
                        announcement.setAttribute('aria-live', 'polite');
                        announcement.setAttribute('aria-atomic', 'true');
                        announcement.className = 'sr-only';
                        announcement.textContent = 'Theme set to ' + theme + ' mode';
                        document.body.appendChild(announcement);
                        setTimeout(() => document.body.removeChild(announcement), 1000);
                      }
                    } else {
                      // Server-side or localStorage unavailable - use dark theme
                      if (typeof document !== 'undefined') {
                        document.documentElement.className = 'dark';
                      }
                    }
                  } catch (e) {
                    // Fallback to dark theme if any error occurs
                    if (typeof document !== 'undefined') {
                      document.documentElement.className = 'dark';
                    }
                  }
                })();
              `
            }}
          />
        )}
      </body>
    </html>
  );
}