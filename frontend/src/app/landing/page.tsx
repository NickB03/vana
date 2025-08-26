/**
 * Landing Page
 * Marketing page for unauthenticated users
 */

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { useEffect } from 'react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to the main app
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const features = [
    {
      icon: Icons.messageSquare,
      title: 'AI Chat',
      description: 'Engage in intelligent conversations with advanced AI agents'
    },
    {
      icon: Icons.zap,
      title: 'Canvas Mode',
      description: 'Visual workspace for creative collaboration and ideation'
    },
    {
      icon: Icons.users,
      title: 'Multi-Agent System',
      description: '8 specialized AI agents working together on complex tasks'
    },
    {
      icon: Icons.shield,
      title: 'Enterprise Security',
      description: 'OAuth 2.0, end-to-end encryption, and data privacy'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Icons.zap className="h-6 w-6" />
              <span className="font-bold text-lg">Vana</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <GoogleLoginButton
              text="Sign In"
              size="default"
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Enterprise AI Research
            <span className="block text-primary">Powered by Google ADK</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            Transform complex research questions into comprehensive reports with our
            multi-agent AI system. Interactive planning meets autonomous execution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GoogleLoginButton
              size="lg"
              text="Get Started"
              className="text-lg px-8"
            />
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-lg px-8"
            >
              <Link
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
                <Icons.arrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Powerful Features for Enterprise Research
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-24">
        <Card className="mx-auto max-w-2xl bg-primary text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Ready to Transform Your Research?</CardTitle>
            <CardDescription className="text-primary-foreground/90">
              Join thousands of users leveraging AI for comprehensive research
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <GoogleLoginButton
              size="lg"
              variant="outline"
              text="Sign Up Free"
              className="text-lg px-8"
            />
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Icons.zap className="h-6 w-6" />
            <p className="text-center text-sm leading-loose md:text-left">
              Built with Google ADK. Open source on{' '}
              <Link
                href="https://github.com/NickB03/vana"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
                aria-label="Open Vana repository on GitHub (opens in a new tab)"
              >
                GitHub
              </Link>
            </p>
          </div>
          <div className="flex gap-4">
            <Link 
              href="https://github.com/NickB03/vana/blob/main/docs/terms.md" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:underline"
            >
              Terms
            </Link>
            <Link 
              href="https://github.com/NickB03/vana/blob/main/docs/privacy.md" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:underline"
            >
              Privacy
            </Link>
            <Link 
              href="https://github.com/NickB03/vana/issues" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:underline"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}