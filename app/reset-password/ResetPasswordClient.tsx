"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordClient() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setToken(hash.get("access_token") || "");
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorking(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirmPassword") || "");

    if (password !== confirm) {
      setWorking(false);
      setError("The passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, password }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);

    if (!response.ok) {
      setError(data.error || "Unable to update the password.");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="login-card">
        <h2>Password updated.</h2>
        <p>You can now sign in with your new password.</p>
        <a className="button button-primary" href="/login">Go to sign in</a>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2>Reset password</h2>
      {!token && (
        <div className="portal-message error">
          This reset link does not contain a valid recovery token.
        </div>
      )}
      {error && <div className="portal-message error">{error}</div>}
      <form className="portal-form" onSubmit={submit}>
        <label>
          <span>New password</span>
          <input name="password" type="password" minLength={12} required autoComplete="new-password" />
          <small>Use at least 12 characters.</small>
        </label>
        <label>
          <span>Confirm password</span>
          <input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" />
        </label>
        <button className="button button-primary portal-submit" disabled={!token || working}>
          {working ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
