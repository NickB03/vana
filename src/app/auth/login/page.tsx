'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error, clearError } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    clearError()

    if (!identifier.trim() || !password.trim()) {
      setLocalError('Please provide both your email/username and password.')
      return
    }

    try {
      const payload = identifier.includes('@')
        ? { email: identifier.trim(), password: password.trim() }
        : { username: identifier.trim(), password: password.trim() }

      await login(payload)

      const redirectTo = searchParams?.get('redirect') || '/'
      router.replace(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in'
      setLocalError(message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Sign in to Vana</CardTitle>
          <CardDescription>Authenticate to access live research sessions and streaming updates.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                Email or Username
              </label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={event => setIdentifier(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </div>

            {(localError || error) ? (
              <Alert variant="destructive">
                <AlertDescription>{localError || error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Need an account? Contact your workspace admin to request access.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="text-sm text-muted-foreground">Loading authentication form…</div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
