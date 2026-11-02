import { useState } from 'react';
import { api } from '../services/api';

/**
 * Full-screen login overlay.
 * Authenticates against the backend — no client-side credential comparison.
 */
export default function LoginScreen({ onLoginSuccess, showToast }) {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isOtp,     setIsOtp]     = useState(false);
  const [forgotView,setForgotView]= useState(false);
  const [forgotEmail,setForgotEmail]=useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await api.login(
        email.trim().toLowerCase(),
        isOtp ? undefined : password,
        isOtp ? password : undefined,
        isOtp ? 'otp' : 'password'
      );
      onLoginSuccess(resp.user);
      showToast(`Signed in as ${resp.user.name} (${resp.user.role})`, 'success');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
      showToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    showToast(`Password reset link sent to ${forgotEmail}. Please check your inbox.`, 'success');
    setForgotView(false);
    setForgotEmail('');
  };

  return (
    <div
      className="login-screen-overlay active"
      style={{ display: 'flex', background: 'radial-gradient(circle at 50% 25%, #1e293b 0%, #0f172a 100%)', zIndex: 99999 }}
    >
      <div
        className="login-container-card"
        style={{ background: '#ffffff', borderRadius: 14, maxWidth: 440, width: '100%', overflow: 'hidden' }}
      >
        {/* Brand header */}
        <div className="login-header-banner">
          <div className="login-brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
            </svg>
          </div>
          <div className="login-title">University Repository</div>
          <div className="login-subtitle">Official Institutional Sign-In</div>
        </div>

        {!forgotView ? (
          <form className="login-body-form" onSubmit={handleLogin}>
            {error && (
              <div style={{
                background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b',
                padding:'10px 14px', borderRadius:8, fontSize:12.5, marginBottom:14,
                display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.4,
              }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:2 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="login-input-group">
              <label className="login-label">Official Institutional Email</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  className="login-input"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="e.g. your.name@university.edu"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-input-group">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <label className="login-label">{isOtp ? 'Security OTP' : 'Password'}</label>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => { setIsOtp(!isOtp); setPassword(''); }}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}
                >
                  {isOtp ? 'Use Password' : 'Use OTP'}
                </button>
              </div>
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={isOtp ? 'text' : 'password'}
                  className="login-input"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={isOtp ? 'Enter 4-digit Security OTP' : 'Enter your institutional password'}
                  autoComplete={isOtp ? 'one-time-code' : 'current-password'}
                  maxLength={isOtp ? 4 : undefined}
                />
              </div>
            </div>

            {isOtp && (
              <p style={{ fontSize: 11.5, color: '#64748b', margin: '-4px 0 12px 0' }}>
                Demo OTP: <strong>1234</strong> &mdash; sent to your registered email.
              </p>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', margin:'4px 0 16px 0' }}>
              <button
                type="button"
                className="login-forgot-link"
                onClick={() => setForgotView(true)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to Repository →'}
            </button>
          </form>
        ) : (
          <form className="login-body-form" onSubmit={handleForgot}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 4px 0' }}>Reset Password</h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'0 0 14px 0' }}>
              Enter your registered email to receive a reset link.
            </p>
            <div className="login-input-group">
              <label className="login-label">Registered Email</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  className="login-input"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. your.name@university.edu"
                />
              </div>
            </div>
            <button type="submit" className="login-btn-submit" style={{ marginTop:8 }}>
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => setForgotView(false)}
              style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'#64748b', fontSize:12.5, cursor:'pointer' }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
