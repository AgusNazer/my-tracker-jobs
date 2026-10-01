import { createClient } from '../../lib/supabase';
import { redirect } from 'next/navigation';
import '../tracker.css';

async function loginAction(formData: FormData) {
  'use server';
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/');
}

async function signUpAction(formData: FormData) {
  'use server';
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '90vh' }}>
      <div className="panelBox" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="panelHeader">
          <span style={{ color: 'var(--accent-total)' }}>AUTH // ACCESS CONTROL</span>
          <span className="badge">POSTGRES RLS</span>
        </div>

        <form className="formStack">
          {error && <div className="errorBanner">{error}</div>}

          <div className="fieldGroup">
            <label className="label">EMAIL CORPORATIVO / DEV:</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="input"
              placeholder="tu@email.com"
            />
          </div>

          <div className="fieldGroup">
            <label className="label">PASSWORD:</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="input"
              placeholder="••••••••••••"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              formAction={loginAction}
              className="btnSubmit btnAnyone"
              style={{ flex: 1 }}
            >
              INGRESAR
            </button>

            <button
              type="submit"
              formAction={signUpAction}
              className="btnSubmit"
              style={{
                flex: 1,
                background: '#1a1f2c',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
            >
              CREAR CUENTA
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}