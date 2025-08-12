'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Agents', href: '/agents' },
  { name: 'Canvas', href: '/canvas' },
  { name: 'Docs', href: '/docs' },
]

export function Header() {
  const [mounted, setMounted] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex-1" />
          <div className="h-9 w-9" /> {/* Placeholder for theme toggle */}
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <span className="font-bold text-xl">Vana</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  'text-foreground/60'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t bg-background"
          >
            <nav className="container py-4">
              <div className="flex flex-col space-y-4">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-foreground/60 hover:text-foreground/80 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}