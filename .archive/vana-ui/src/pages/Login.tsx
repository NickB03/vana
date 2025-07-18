import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[var(--accent-blue)] rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">
            Welcome to <span className="gemini-gradient-text">VANA</span>
          </h1>
          <p className="text-[var(--text-secondary)]">
            Sign in to continue to your AI assistant
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text-primary)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[var(--bg-input)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--text-primary)]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[var(--bg-input)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
              />
            </div>
          </div>

          {error && (
            <div className="text-[var(--accent-red)] text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          {/* Demo Credentials */}
          <div className="text-center text-sm text-[var(--text-secondary)]">
            <p>Demo: Use any email and password to sign in</p>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          <p>
            By signing in, you agree to VANA's{' '}
            <a href="#" className="text-[var(--accent-blue)] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[var(--accent-blue)] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;