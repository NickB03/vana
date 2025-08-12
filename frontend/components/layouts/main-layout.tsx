import * as React from 'react'
import { Header } from '@/components/sections/header'
import { Footer } from '@/components/sections/footer'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}