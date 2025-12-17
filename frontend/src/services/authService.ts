export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const API_BASE = '/api';

export async function registerCompany(payload: RegisterPayload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || text);
    } catch {
      throw new Error(text || 'Registration failed');
    }
  }
  return res.json();
}

export async function loginCompany(payload: LoginPayload) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || text);
    } catch {
      throw new Error(text || 'Login failed');
    }
  }
  return res.json();
}