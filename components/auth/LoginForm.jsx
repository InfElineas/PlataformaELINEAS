'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { swalLoading, swalSuccess, swalError, swalClose } from '@/lib/swal';

export default function LoginForm({ redirectTo = '/' }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    swalLoading('Autenticando...', 'Validando credenciales');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password, rememberMe }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // cerrar el loading y mostrar error visual
        swalClose();
        const msg = data.error || 'Credenciales inválidas';
        setError(msg);
        await swalError('Error de login', msg);
        return;
      }

      // éxito: cerrar loading y mostrar success
      swalClose();
      await swalSuccess('Bienvenido', '');

      setLoading(false);

      // pequeña pausa para que se vea el swal antes de navegar
      setTimeout(() => {
        router.push(redirectTo || '/');
        router.refresh();
      }, 200);
    } catch (err) {
      console.error(err);
      swalClose();
      const msg = err.message || 'No se pudo iniciar sesión.';
      setError('Unable to complete login. Please try again.');
      await swalError('Error de login', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="identifier">Correo o usuario</Label>
        <Input
          id="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="usuario@empresa.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(value) => setRememberMe(Boolean(value))}
          />
          <span>Recordarme</span>
        </label>
        <a href="/forgot-password" className="text-sm text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
      {error && (
        <div
          className={cn(
            'rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive',
          )}
        >
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
