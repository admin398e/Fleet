"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    searchParams.get("error") ? "error" : "idle",
  );
  const [message, setMessage] = useState("");

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  if (status === "sent") {
    return (
      <div className="card text-center">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          We sent a sign-in link to <span className="font-medium">{email}</span>.
          Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={signInWithGoogle} className="btn-secondary w-full">
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        or
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-primary w-full"
        >
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>

      {status === "error" && (
        <p className="text-center text-sm text-red-600">
          {message || "Something went wrong. Please try again."}
        </p>
      )}
    </div>
  );
}
