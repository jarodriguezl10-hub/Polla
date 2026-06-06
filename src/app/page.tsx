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

  // Policies states
  const [acceptedPrivacy, setAcceptedPrivacy] = useState<'yes' | 'no' | null>(null);
  const [acceptedTransparency, setAcceptedTransparency] = useState<'yes' | 'no' | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  
  // No-Confirmation states
  const [privacyNoConfirmed, setPrivacyNoConfirmed] = useState(false);
  const [transparencyNoConfirmed, setTransparencyNoConfirmed] = useState(false);

  const handlePrivacyChange = (val: 'yes' | 'no') => {
    setAcceptedPrivacy(val);
    if (val === 'yes') setPrivacyNoConfirmed(false);
  };

  const handleTransparencyChange = (val: 'yes' | 'no') => {
    setAcceptedTransparency(val);
    if (val === 'yes') setTransparencyNoConfirmed(false);
  };

  useEffect(() => {
    setMounted(true);
    // Session Guard check
    if (localStorage.getItem('polla_user')) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (step === 'otp' && typeof navigator !== 'undefined' && 'credentials' in navigator) {
      const ac = new AbortController();
      
      try {
        (navigator.credentials as any).get({
          otp: { transport: ['email', 'sms'] },
          signal: ac.signal
        }).then((otp: any) => {
          if (otp && otp.code) {
            setCode(otp.code);
          }
        }).catch((err: any) => {
          console.log('WebOTP error:', err);
        });
      } catch (e) {
        // Ignore if API not fully supported
      }

      return () => {
        ac.abort();
      };
    }
  }, [step]);

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

    if (showNameInput) {
      if (!name || !name.trim()) {
        showToast('Por favor, ingresa tu nombre para continuar', 'error');
        return;
      }
      if (acceptedPrivacy === null || acceptedTransparency === null) {
        showToast('Debes responder a las políticas de Privacidad y Transparencia', 'error');
        return;
      }
      if (acceptedPrivacy === 'no' || acceptedTransparency === 'no') {
        showToast('No puedes registrarte sin aceptar las políticas obligatorias.', 'error');
        return;
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: showNameInput ? name : '' })
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

    const normalizedEmail = email.toLowerCase().trim();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code, name })
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
            <img src="/dentro-de-un-ano-se-celebrara-la-fiesta-del-futbol-mundial-2.jpg" alt="Fiesta del Fútbol Mundial" className="login-hero-img" />
          </div>

          {step === 'email' ? (
            <form onSubmit={handleRequestOTP}>
              {showNameInput && (
                <div className="form-group animate-fade-in">
                  <label htmlFor="login-name">
                    <i className="fa-solid fa-user"></i> TU NOMBRE O ALIAS
                  </label>
                  <input
                    type="text"
                    id="login-name"
                    placeholder="Ejemplo. Armando Casas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {showNameInput && (
                <div className="form-group animate-fade-in" style={{ backgroundColor: '#ffffff', color: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <p style={{ margin: '0 0 15px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Políticas Obligatorias</p>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>1. Tratamiento de Datos Personales</span>
                      <button type="button" onClick={() => setShowPrivacyModal(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '4px' }}>Leer política</button>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name="privacy" checked={acceptedPrivacy === 'yes'} onChange={() => handlePrivacyChange('yes')} disabled={loading} style={{ transform: 'scale(1.2)' }} /> Sí acepto
                      </label>
                      <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name="privacy" checked={acceptedPrivacy === 'no'} onChange={() => handlePrivacyChange('no')} disabled={loading} style={{ transform: 'scale(1.2)' }} /> No acepto
                      </label>
                    </div>
                    {acceptedPrivacy === 'no' && (
                      <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.85rem' }}>
                        <p style={{ margin: '0 0 10px 0' }}><i className="fa-solid fa-triangle-exclamation"></i> <strong>Advertencia:</strong> Si no aceptas, no podrás registrarte en la Polla Mundialista.</p>
                        {!privacyNoConfirmed ? (
                          <button type="button" onClick={() => setPrivacyNoConfirmed(true)} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', fontSize: '0.85rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Estoy seguro, cancelar registro</button>
                        ) : (
                          <p style={{ margin: 0, fontWeight: 600 }}>Has rechazado la política. Tu registro ha sido cancelado. Puedes cerrar la ventana.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>2. Manejo de Transparencia (Zero Trust)</span>
                      <button type="button" onClick={() => setShowTransparencyModal(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '4px' }}>Leer política</button>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name="transparency" checked={acceptedTransparency === 'yes'} onChange={() => handleTransparencyChange('yes')} disabled={loading} style={{ transform: 'scale(1.2)' }} /> Sí acepto
                      </label>
                      <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name="transparency" checked={acceptedTransparency === 'no'} onChange={() => handleTransparencyChange('no')} disabled={loading} style={{ transform: 'scale(1.2)' }} /> No acepto
                      </label>
                    </div>
                    {acceptedTransparency === 'no' && (
                      <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.85rem' }}>
                        <p style={{ margin: '0 0 10px 0' }}><i className="fa-solid fa-triangle-exclamation"></i> <strong>Advertencia:</strong> Si no aceptas, no podrás registrarte en la Polla Mundialista.</p>
                        {!transparencyNoConfirmed ? (
                          <button type="button" onClick={() => setTransparencyNoConfirmed(true)} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', fontSize: '0.85rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Estoy seguro, cancelar registro</button>
                        ) : (
                          <p style={{ margin: 0, fontWeight: 600 }}>Has rechazado la política. Tu registro ha sido cancelado. Puedes cerrar la ventana.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="login-email">
                  <i className="fa-solid fa-envelope"></i> INGRESA TU CORREO ELECTRONICO PERSONAL
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
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
                  name="otp"
                  id="login-otp"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
            <p>Version 1.3</p>
          </footer>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Privacy Policy Modal (Read Only overlay) */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', maxWidth: '700px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0284c7', fontSize: '1.4rem', fontWeight: 700 }}>Política de Privacidad y Tratamiento de Datos</h2>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '15px', fontSize: '1.05rem', lineHeight: '1.7', color: '#334155' }}>
              <p><strong>1. Finalidad del Tratamiento</strong><br/>La información suministrada será tratada con los siguientes fines específicos:<br/>- Administración y gestión operativa de la quiniela.<br/>- Comunicación directa con los participantes sobre actualizaciones del evento.<br/>- Resolución de consultas, reclamos o disputas sobre la puntuación del juego.</p>
              <p><strong>2. Datos Recolectados</strong><br/>- Datos de Carácter Personal: Nombre (o Alias) y Correo Electrónico.<br/>- Datos de Juego: Pronósticos realizados y puntajes obtenidos (estos datos son asociados a tu Alias y no constituyen información sensible).</p>
              <p><strong>3. Principio de Temporalidad</strong><br/>En cumplimiento del principio de limitación de plazo, los datos personales serán tratados únicamente por el tiempo necesario para cumplir con la finalidad del juego y el periodo de auditoría post-evento. La eliminación total y definitiva se ejecutará exactamente 30 días calendario después de la gran final de la Copa del Mundo 2026.</p>
              <p><strong>4. Medidas de Seguridad</strong><br/>La información será almacenada en entornos digitales seguros. El acceso está restringido únicamente al administrador de la quiniela para fines exclusivos del desarrollo del juego.</p>
              <p><strong>5. Derechos de los Titulares</strong><br/>Como participante, tienes derecho a:<br/>- Conocer, actualizar y rectificar tus datos.<br/>- Solicitar prueba de la autorización otorgada.<br/>- Solicitar la supresión de tus datos antes de que finalice el periodo de retención.</p>
              <p><strong>6. Consentimiento</strong><br/>Al registrarte en esta quiniela, el participante declara que ha leído, comprendido y aceptado expresamente el tratamiento de sus datos personales bajo las condiciones aquí expuestas.</p>
              <p><strong>7. Comunicación de Pronósticos</strong><br/>Como parte de la dinámica, se enviarán actualizaciones y resúmenes de pronósticos al correo registrado. El participante podrá optar por no recibir estas comunicaciones indicándolo a los organizadores sin que esto afecte su participación en la quiniela.</p>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="btn btn-primary" style={{ marginTop: '24px', padding: '12px', fontSize: '1.1rem', fontWeight: 600, borderRadius: '8px' }}>Entendido, Volver</button>
          </div>
        </div>
      )}

      {/* Transparency Policy Modal (Read Only overlay) */}
      {showTransparencyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', maxWidth: '700px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0284c7', fontSize: '1.4rem', fontWeight: 700 }}>Políticas de Transparencia (Zero Trust)</h2>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '15px', fontSize: '1.05rem', lineHeight: '1.7', color: '#334155' }}>
              <p>Para garantizar un juego 100% justo y libre de manipulaciones, hemos implementado una arquitectura <strong>Zero Trust</strong> (Cero Confianza), en la cual ni siquiera el administrador puede alterar los pronósticos una vez bloqueados.</p>
              <p><strong>1. Envío de Correos Automáticos y Públicos</strong><br/>Antes de iniciar cada partido (exactamente 10 minutos antes, cuando se bloquea la plataforma), el sistema enviará automáticamente un correo electrónico a todos los participantes con una copia exacta e inmutable de todos los pronósticos registrados para ese partido. Así, todos tendrán en su buzón la evidencia real y nadie podrá cambiar su marcador.</p>
              <p><strong>2. Bloqueo Inquebrantable de Partidos</strong><br/>A falta de 10 minutos para el silbatazo inicial, la base de datos bloquea permanentemente cualquier actualización de pronósticos para dicho partido. No existen puertas traseras ("backdoors") para eludir esta regla.</p>
              <p><strong>3. Caché Estático y Público</strong><br/>Toda la tabla de posiciones y resultados utiliza una capa de Caché Estático Inmutable en la nube. Los puntajes y cálculos de aciertos exactos, diferencias y ganadores se realizan bajo reglas estrictas que no pueden modificarse manualmente.</p>
              <p>Al aceptar esta política, declaras entender que <strong>Polla Mundialista 2026</strong> asegura la completa transparencia de tus datos y el desarrollo íntegro del torneo.</p>
            </div>
            <button onClick={() => setShowTransparencyModal(false)} className="btn btn-primary" style={{ marginTop: '24px', padding: '12px', fontSize: '1.1rem', fontWeight: 600, borderRadius: '8px' }}>Entendido, Volver</button>
          </div>
        </div>
      )}
    </div>
  );
}
