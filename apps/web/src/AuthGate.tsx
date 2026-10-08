import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError, clearAuthToken, readAuthToken, writeAuthToken } from "./api";

type Mode = "login" | "register";

type SessionResponse = {
  token: string;
  playerId: string;
  username: string;
  adoptedExistingWorld: boolean;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readAuthToken());
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ username: string }>("/api/v1/auth/me").catch((err: unknown) => {
      if (cancelled) return;
      if (err instanceof ApiError && err.status === 401) {
        clearAuthToken();
        setToken(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    try {
      const path = mode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
      const session = await api<SessionResponse>(path, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      writeAuthToken(session.token);
      if (session.adoptedExistingWorld) {
        setNotice("已接上這台機器上原本的世界。");
      }
      setToken(session.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登入沒有成功");
    } finally {
      setPending(false);
    }
  }

  function logout() {
    clearAuthToken();
    setToken(null);
    setPassword("");
    setNotice("");
  }

  if (!token) {
    return (
      <main className="login-gate">
        <form className="login-card" onSubmit={onSubmit}>
          <h1>帝國掘起</h1>
          <p>{mode === "register" ? "註冊一個世界" : "登入你的世界"}</p>
          <label>
            名字
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            密碼
            <input
              name="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending ? "請稍候" : mode === "register" ? "註冊" : "登入"}
          </button>
          <button
            type="button"
            className="login-switch"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "還沒有名字？註冊" : "已有名字？登入"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      <button type="button" className="login-logout" onClick={logout}>
        登出
      </button>
      {notice ? <p className="login-notice">{notice}</p> : null}
      {children}
    </>
  );
}
