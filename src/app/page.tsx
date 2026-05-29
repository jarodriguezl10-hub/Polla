"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [etherealUrl, setEtherealUrl] = useState<string | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Session Guard check
    if (localStorage.getItem('polla_user')) {
      router.push('/dashboard');
    }
  }, [router]);

  if (!mounted) {
    return null; // Prevents hydration mismatch on browser extensions/autofill attributes
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Ingresa un correo electrónico válido', 'error');
      return;
    }

    if (showNameInput && (!name || !name.trim())) {
      showToast('Por favor, ingresa tu nombre para continuar', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: showNameInput ? name : '' })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requiresName) {
          setShowNameInput(true);
          showToast(data.message || 'Tu correo no está registrado. Ingresa tu nombre para continuar.', 'success');
        } else {
          setStep('otp');
          showToast('Código OTP generado y enviado al correo.', 'success');
          if (data.previewUrl) {
            setEtherealUrl(data.previewUrl);
          } else {
            setEtherealUrl(null);
          }
        }
      } else {
        showToast(data.error || 'Error al solicitar el código OTP', 'error');
      }
    } catch (err) {
      showToast('Error de red al solicitar OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      showToast('Ingresa el código OTP de 6 dígitos', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, name })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('polla_user', JSON.stringify(data.user));
        showToast('¡Ingreso exitoso! Redireccionando...', 'success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        showToast(data.error || 'Código OTP incorrecto o expirado', 'error');
      }
    } catch (err) {
      showToast('Error de red al verificar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body-layout">
      {/* Decorative soccer pitch backgrounds */}
      <div className="soccer-pitch-bg"></div>
      <div className="decor-circle circle-1"></div>
      <div className="decor-circle circle-2"></div>

      <div className="login-wrapper">
        <div className="glass-panel login-card">
          <div className="login-header">
            <div className="logo-shield">
              <img src="/JD8048-FUTS_balon.jpg" alt="Balón" className="logo-ball-image" />
            </div>
            <h1>Polla Mundial 2026</h1>
            <p className="subtitle">Juego de Pronósticos Oficial</p>
          </div>

          {/* Player image banner */}
          <div className="login-hero-container">
            <img src="/LUCHO-web-1024x576.png" alt="Luis Díaz" className="login-hero-img" />
          </div>

          {step === 'email' ? (
            <form onSubmit={handleRequestOTP}>
              {showNameInput && (
                <div className="form-group animate-fade-in">
                  <label htmlFor="login-name">
                    <i className="fa-solid fa-user"></i> Tu Nombre
                  </label>
                  <input
                    type="text"
                    id="login-name"
                    placeholder="Ej. Alejandro Rodriguez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="login-email">
                  <i className="fa-solid fa-envelope"></i> Ingresa tu Correo Electrónico
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Procesando...
                  </>
                ) : showNameInput ? (
                  <>
                    Registrarse y Enviar OTP <i className="fa-solid fa-user-plus"></i>
                  </>
                ) : (
                  <>
                    Enviar Código OTP <i className="fa-solid fa-paper-plane"></i>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION FORM */
            <form onSubmit={handleVerifyOTP}>
              <div className="alert alert-info">
                <p>Hemos enviado un código OTP a tu correo.</p>
              </div>

              <div className="form-group">
                <label htmlFor="login-otp">
                  <i className="fa-solid fa-key"></i> Introduce el Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  id="login-otp"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="btn-group-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('email')}
                  disabled={loading}
                >
                  <i className="fa-solid fa-chevron-left"></i> Atrás
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Ingresando...
                    </>
                  ) : (
                    <>
                      Ingresar <i className="fa-solid fa-right-to-bracket"></i>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Ethereal Mail Preview URL */}
          {etherealUrl && (
            <div className="ethereal-helper-box">
              <div className="helper-header">
                <span className="live-badge">MODO DEMO</span>
                <span>
                  <i className="fa-solid fa-inbox"></i> Correo Electrónico Generado:
                </span>
              </div>
              <div className="helper-body">
                <p>Haz clic abajo para abrir la previsualización del correo enviado y copiar tu código OTP:</p>
                <a
                  href={etherealUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning btn-block"
                  style={{ marginTop: '10px', color: '#000' }}
                >
                  <i className="fa-solid fa-envelope-open-text"></i> Abrir Correo Recibido 📩
                </a>
              </div>
            </div>
          )}

          <footer className="login-footer">
            <p>Versión 1.0.0 | Creador: Alejandro Rodriguez</p>
          </footer>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
