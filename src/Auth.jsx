import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { TrendingUp, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Auth({ dark }) {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const t = dark
    ? { bg: "#0b0b16", s: "#141427", bd: "#272748", fg: "#e0e2eb", fg2: "#f4f4f8", mt: "#7a7f9d", ib: "#1c1c34", ibd: "#33335a", acc: "#6366f1", rd: "#f87171" }
    : { bg: "#f0f1f5", s: "#fff", bd: "#e2e4ea", fg: "#1f2937", fg2: "#111827", mt: "#6b7280", ib: "#fff", ibd: "#d1d5db", acc: "#4f46e5", rd: "#dc2626" };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr(null); setMsg(null);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setErr(error.message);
      else setMsg("Check your email for the reset link.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else setMsg("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setErr(error.message); setLoading(false); }
  }

  const inp = { height: 44, borderRadius: 10, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 12px 0 40px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
  const btn = { height: 44, border: "none", borderRadius: 10, padding: "0 20px", background: t.acc, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: t.acc, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <TrendingUp size={24} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: t.fg2, letterSpacing: -0.5 }}>Equity Tracker</h1>
          <p style={{ margin: "8px 0 0", color: t.mt, fontSize: 14 }}>
            {mode === "login" ? "Sign in to your portfolio" : mode === "signup" ? "Create your account" : "Reset your password"}
          </p>
        </div>

        {/* Form */}
        <div style={{ background: t.s, border: `1px solid ${t.bd}`, borderRadius: 16, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: t.mt }} />
              <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            {/* Password (not for reset) */}
            {mode !== "reset" && (
              <div style={{ position: "relative", marginBottom: 16 }}>
                <Lock size={16} style={{ position: "absolute", left: 13, top: 14, color: t.mt }} />
                <input style={inp} type={showPw ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: t.mt, padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {/* Submit */}
            <button type="submit" style={{ ...btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? "..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Google Sign In */}
          {mode !== "reset" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: t.mt, fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: t.bd }} />
                <span>or</span>
                <div style={{ flex: 1, height: 1, background: t.bd }} />
              </div>
              <button onClick={handleGoogle} style={{ ...btn, background: t.ib || t.s, color: t.fg, border: `1px solid ${t.bd}` }} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Messages */}
          {err && <div style={{ marginTop: 14, padding: "8px 12px", borderRadius: 8, background: dark ? "rgba(220,38,38,0.15)" : "#fef2f2", color: t.rd, fontSize: 12, fontWeight: 500 }}>{err}</div>}
          {msg && <div style={{ marginTop: 14, padding: "8px 12px", borderRadius: 8, background: dark ? "rgba(99,102,241,0.15)" : "#eef2ff", color: t.acc, fontSize: 12, fontWeight: 500 }}>{msg}</div>}

          {/* Mode switcher */}
          <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: t.mt }}>
            {mode === "login" && (<>
              <span>No account? </span><button onClick={() => { setMode("signup"); setErr(null); setMsg(null); }} style={{ background: "none", border: "none", color: t.acc, cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>Sign up</button>
              <span style={{ margin: "0 8px" }}>·</span>
              <button onClick={() => { setMode("reset"); setErr(null); setMsg(null); }} style={{ background: "none", border: "none", color: t.acc, cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>Forgot password?</button>
            </>)}
            {mode === "signup" && (<>
              <span>Have an account? </span><button onClick={() => { setMode("login"); setErr(null); setMsg(null); }} style={{ background: "none", border: "none", color: t.acc, cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>Sign in</button>
            </>)}
            {mode === "reset" && (<>
              <button onClick={() => { setMode("login"); setErr(null); setMsg(null); }} style={{ background: "none", border: "none", color: t.acc, cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>← Back to sign in</button>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
