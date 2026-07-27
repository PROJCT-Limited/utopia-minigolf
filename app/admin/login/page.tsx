"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminLoginAction } from "@/lib/admin/loginAction";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("user", user);
    formData.set("pass", pass);

    const result = await adminLoginAction(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="wrap">
      <div className={styles.loginCard}>
        <span className="lbl">UTOPIA Admin</span>
        <h1 className={styles.title} style={{ marginTop: 8, marginBottom: 20, fontSize: 24 }}>
          Sign in
        </h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field} style={{ marginBottom: 14 }}>
            <label htmlFor="user">Username</label>
            <input id="user" type="text" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </div>
          <div className={styles.field} style={{ marginBottom: 18 }}>
            <label htmlFor="pass">Password</label>
            <input
              id="pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
