import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import App from "./App";
 
function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
 
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
 
    return () => subscription.unsubscribe();
  }, []);
 
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b16", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "#7a7f9d", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }
 
  if (!session) {
    return <Auth dark={true} />;
  }
 
  return <App session={session} />;
}
 
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
 
