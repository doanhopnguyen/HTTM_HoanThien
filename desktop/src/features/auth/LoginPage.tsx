import { useState, type FormEvent } from "react";
import { ShieldCheck, Waves } from "lucide-react";
import { errorMessage } from "@pool-safety/shared";
import { api, baseUrl } from "../../api/client";
import { Button, Field, Input } from "../../components/ui";
import { restoreAuth, useAuthStore } from "../../stores/authStore";
export function LoginPage() {
  const offline = useAuthStore((s) => s.offline);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const session = await api.auth.login(
        String(form.get("username")),
        String(form.get("password")),
        remember,
      );
      if (session.user.role !== "ADMIN") {
        await api.auth.logout();
        setError(
          "The desktop control center requires an ADMIN account. Use the mobile app for STAFF.",
        );
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-brand">
        <Waves size={70} />
        <h1>
          Every second
          <br />
          makes a difference.
        </h1>
        <p>One pool. One team. A clear view of every alert.</p>
        <div>
          <ShieldCheck /> Pool Safety Monitoring
        </div>
      </section>
      <section className="login-form">
        <div className="brand-icon">
          <Waves />
        </div>
        <h1>Pool Safety Monitoring</h1>
        <p>Sign in to the control center</p>
        {offline && (
          <div className="connection-hint" role="status">
            The backend is unreachable, so your saved session could not be
            checked. It has been kept.{" "}
            <Button variant="ghost" onClick={() => void restoreAuth()}>
              Retry
            </Button>
          </div>
        )}
        <form onSubmit={submit}>
          <Field label="Username">
            <Input name="username" autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />{" "}
            Remember me on this device
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </Button>
        </form>
        <small className="muted">Backend: {baseUrl}</small>
        <BackendConfig />
      </section>
    </main>
  );
}
function BackendConfig() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(baseUrl);
  const [error, setError] = useState("");
  if (!window.poolSafety) return null;
  return (
    <div>
      <Button variant="ghost" onClick={() => setOpen(!open)}>
        Backend connection
      </Button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await window.poolSafety.saveConfig(url);
              window.location.reload();
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <Field label="Backend origin">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              required
            />
          </Field>
          {error && <p className="error">{error}</p>}
          <Button>Save connection</Button>
        </form>
      )}
    </div>
  );
}
