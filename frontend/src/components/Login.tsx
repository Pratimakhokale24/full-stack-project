import React, { useState } from 'react';
import { registerCompany, loginCompany } from '../services/authService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

interface LoginProps {
  onAuthenticated: (token: string, companyName: string, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const res = await registerCompany({ companyName, email, password });
        // Auto-login after register for convenience
        const loginRes = await loginCompany({ email, password });
        onAuthenticated(loginRes.token, res.companyName, res.email);
        localStorage.setItem('authToken', loginRes.token);
        localStorage.setItem('companyName', res.companyName);
        localStorage.setItem('userEmail', res.email);
      } else {
        const res = await loginCompany({ email, password });
        onAuthenticated(res.token, res.user.companyName, res.user.email);
        localStorage.setItem('authToken', res.token);
        localStorage.setItem('companyName', res.user.companyName);
        localStorage.setItem('userEmail', res.user.email);
      }
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{mode === 'login' ? 'Sign In' : 'Create Company Account'}</h2>
        <p className="text-slate-500 mb-4">Access the Job Screening Assistant by signing in or creating an account.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="text-sm text-slate-700">Company Name</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="text-sm text-slate-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-slate-700">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create account' : 'Have an account? Sign in'}
            </Button>
            <Button type="submit" disabled={loading}>{loading ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Register')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;