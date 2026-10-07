"use client";

import { FormEvent, useEffect, useState } from "react";

type Mode = "signin" | "signup";

export default function LoginPortal() {
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => {
        if (response.ok) window.location.replace("/account");
      })
      .catch(() => null);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setWorking(true);

    const form = new FormData(event.currentTarget);
    const payload =
      mode === "signin"
        ? {
            email: form.get("email"),
            password: form.get("password"),
          }
        : {
            businessName: form.get("businessName"),
            contactName: form.get("contactName"),
            email: form.get("email"),
            password: form.get("password"),
          };

    const response = await fetch(
      mode === "signin" ? "/api/auth/login" : "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json().catch(() => ({}));
    setWorking(false);

    if (!response.ok) {
      setError(data.error || "Unable to continue.");
      return;
    }

    if (mode === "signin" || data.signedIn) {
      window.location.assign("/account");
      return;
    }

    setMessage(
      data.message || "Check your email to confirm your account, then sign in."
    );
    setMode("signin");
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setWorking(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("resetEmail") }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setError(data.error || "Unable to request a password reset.");
      return;
    }
    setMessage(data.message);
    setResetOpen(false);
  }

  return (
    <div className="login-panel">
      <div className="login-mode-switch" role="tablist" aria-label="Customer account">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => {
            setMode("signin");
            setError("");
            setMessage("");
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => {
            setMode("signup");
            setError("");
            setMessage("");
          }}
        >
          Create account
        </button>
      </div>

      <div className="login-card">
        <div className="login-card-heading">
          <p className="eyebrow">
            {mode === "signin" ? "Welcome back" : "New customer account"}
          </p>
          <h2>{mode === "signin" ? "Customer sign in" : "Create your login"}</h2>
          <p>
            {mode === "signin"
              ? "Use the email and password attached to your Brown Derby portal account."
              : "Create an account with your business email. Email confirmation may be required before your first sign in."}
          </p>
        </div>

        {message && <div className="portal-message success">{message}</div>}
        {error && <div className="portal-message error">{error}</div>}

        <form className="portal-form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                <span>Business name</span>
                <input name="businessName" required maxLength={160} autoComplete="organization" />
              </label>
              <label>
                <span>Contact name</span>
                <input name="contactName" maxLength={160} autoComplete="name" />
              </label>
            </>
          )}
          <label>
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 12 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {mode === "signup" && <small>Use at least 12 characters.</small>}
          </label>
          <button className="button button-primary portal-submit" disabled={working}>
            {working
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {mode === "signin" && (
          <button
            className="portal-text-button"
            type="button"
            onClick={() => setResetOpen((value) => !value)}
          >
            Forgot your password?
          </button>
        )}

        {resetOpen && (
          <form className="reset-inline-form" onSubmit={requestReset}>
            <label>
              <span>Email address</span>
              <input name="resetEmail" type="email" required autoComplete="email" />
            </label>
            <button className="button button-secondary" disabled={working}>
              Send reset link
            </button>
          </form>
        )}
      </div>

      <aside className="login-security-note">
        <strong>Secure customer access</strong>
        <p>
          Passwords are handled by a dedicated authentication service. Brown Derby
          does not store readable customer passwords, and portal sessions use secure,
          HttpOnly browser cookies.
        </p>
      </aside>
    </div>
  );
}
