import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getNonce } from "@/lib/csp";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap'
});

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131314" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CSP nonce meta tag for client-side access */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider>
          {/* Skip to main content link for keyboard users */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Skip to main content
          </a>
          
          <div className="min-h-screen flex flex-col" id="main-content">
            {children}
          </div>
          
          {/* Toast notifications */}
          <Toaster />
        </ThemeProvider>
        
        {/* CSP-compliant theme initialization script - handled by next-themes */}
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // Prevent flash of unstyled content
                (function() {
                  try {
                    const theme = localStorage.getItem('theme') || 'dark';
                    document.documentElement.classList.add(theme);
                    document.documentElement.style.colorScheme = theme;
                  } catch (e) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
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