import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import '../styles/globals.css'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import { StoreProvider, ThemeProvider } from '@/components/providers'

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Vana - AI-Powered Virtual Assistant',
  description: 'Multi-agent AI platform built on Google\'s Agent Development Kit',
  keywords: ['AI', 'assistant', 'chat', 'agents', 'automation', 'productivity'],
  authors: [{ name: 'Vana Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Vana - AI-Powered Virtual Assistant',
    description: 'Multi-agent AI platform built on Google\'s Agent Development Kit',
    type: 'website',
    siteName: 'Vana',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        fontSans.variable,
        fontMono.variable
      )}>
        <ThemeProvider>
          <StoreProvider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                {children}
              </div>
            </div>
            <Toaster />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}