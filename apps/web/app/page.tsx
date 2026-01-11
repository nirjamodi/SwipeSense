"use client";

import { useEffect, useMemo, useState } from "react";

type AuthMode = "login" | "signup";

type UserProfile = {
  name: string;
  dob: string; // YYYY-MM-DD
  cell: string;
  email: string;
};

type Bank = "CIBC" | "RBC" | "Scotiabank" | "TD" | "BMO";

type Merchant =
  | "Walmart"
  | "FreshCo"
  | "No Frills"
  | "Loblaws"
  | "Costco"
  | "Independent Grocer"
  | "Canadian Tire"
  | "Transport"
  | "Dining";

type RecommendResp =
  | { recommended_card: string; reason: string }
  | { use_card: string; reason: string };

const STORAGE_KEY = "swipesense_v1";

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeMerchantForApi(m: Merchant): string {
  // We keep this simple:
  // - Dining => "Dining"
  // - Transport => "Other" (unless you add a transport category in backend later)
  // - Merchant names passed through as-is
  if (m === "Transport") return "Other";
  return m;
}

export default function Home() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  // Step 1: auth
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [user, setUser] = useState<UserProfile>({
    name: "",
    dob: "",
    cell: "",
    email: "",
  });
  const [isAuthed, setIsAuthed] = useState(false);

  // Step 2: card count
  const [cardCount, setCardCount] = useState<number>(1);

  // Step 3: selected banks
  const [banks, setBanks] = useState<Bank[]>([]);

  // Step 4: spending today
  const [merchant, setMerchant] = useState<Merchant>("Walmart");

  // API status + result
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step = useMemo(() => {
    if (!isAuthed) return 1;
    if (isAuthed && !cardCount) return 2;
    if (isAuthed && cardCount && banks.length !== cardCount) return 3;
    return 4;
  }, [isAuthed, cardCount, banks.length]);

  // Load saved state
  useEffect(() => {
    const saved = safeJsonParse<{
      user: UserProfile;
      isAuthed: boolean;
      cardCount: number;
      banks: Bank[];
      merchant: Merchant;
    }>(localStorage.getItem(STORAGE_KEY));

    if (saved) {
      setUser(saved.user ?? user);
      setIsAuthed(!!saved.isAuthed);
      setCardCount(saved.cardCount ?? 1);
      setBanks(saved.banks ?? []);
      setMerchant(saved.merchant ?? "Walmart");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, isAuthed, cardCount, banks, merchant })
    );
  }, [user, isAuthed, cardCount, banks, merchant]);

  // Health check
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, [API_BASE]);

  function toggleBank(b: Bank) {
    setError(null);
    setResult(null);

    setBanks((prev) => {
      const exists = prev.includes(b);
      if (exists) return prev.filter((x) => x !== b);

      // don’t allow selecting more than cardCount
      if (prev.length >= cardCount) return prev;
      return [...prev, b];
    });
  }

  function resetAll() {
    setIsAuthed(false);
    setUser({ name: "", dob: "", cell: "", email: "" });
    setCardCount(1);
    setBanks([]);
    setMerchant("Walmart");
    setResult(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function validateAuth(): string | null {
    if (!user.name.trim()) return "Please enter your name.";
    if (!user.dob) return "Please select your date of birth.";
    if (!user.cell.trim()) return "Please enter your cell number.";
    if (!user.email.trim() || !isValidEmail(user.email))
      return "Please enter a valid email address.";
    return null;
  }

  function handleAuthSubmit() {
    setError(null);
    const err = validateAuth();
    if (err) {
      setError(err);
      return;
    }

    // For hackathon: “login” and “signup” behave same; we just mark as authed.
    setIsAuthed(true);
  }

  async function getRecommendation() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // We'll send merchant as "primary_spend" to match your backend model.
      // The backend currently recommends a "card type" not specifically RBC/CIBC etc.
      // You can later map the result to the selected banks (or store card products).
      const res = await fetch(`${API_BASE}/recommend/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_student: true, // can be part of profile later; hardcoded for now
          primary_spend: normalizeMerchantForApi(merchant),
          priority: "cashback", // can be part of profile later
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as RecommendResp;
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Something went wrong calling the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">SwipeSense 💳</h1>
          <p className="text-gray-600 mt-2">
            Personalized card selection flow (hackathon MVP).
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold">Backend</div>
          <div className={`text-sm ${connected ? "text-green-700" : "text-red-700"}`}>
            {connected ? "✅ Connected" : "❌ Not connected"}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{API_BASE}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-6 p-4 border rounded-2xl">
        <div className="text-sm font-semibold">Progress</div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
          <StepBadge active={step === 1} done={isAuthed}>1) Signup/Login</StepBadge>
          <StepBadge active={step === 2} done={isAuthed && !!cardCount}>2) Card count</StepBadge>
          <StepBadge active={step === 3} done={isAuthed && banks.length === cardCount}>3) Select banks</StepBadge>
          <StepBadge active={step === 4} done={!!result}>4) Spend today</StepBadge>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 border rounded-xl bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* STEP 1 */}
      {!isAuthed && (
        <section className="mt-6 p-5 border rounded-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">1) Signup / Login</h2>
            <div className="flex gap-2 text-sm">
              <button
                className={`px-3 py-1 rounded-lg border ${authMode === "signup" ? "bg-black text-white" : ""}`}
                onClick={() => setAuthMode("signup")}
              >
                Signup
              </button>
              <button
                className={`px-3 py-1 rounded-lg border ${authMode === "login" ? "bg-black text-white" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-1">
            {authMode === "signup"
              ? "Create your profile to personalize recommendations."
              : "Login to continue (demo login uses your entered details)."}
          </p>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <Field label="Full name">
              <input
                className="w-full border rounded-xl p-2"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                placeholder="Nirja Modi"
              />
            </Field>

            <Field label="Date of birth">
              <input
                type="date"
                className="w-full border rounded-xl p-2"
                value={user.dob}
                onChange={(e) => setUser({ ...user, dob: e.target.value })}
              />
            </Field>

            <Field label="Cell number">
              <input
                className="w-full border rounded-xl p-2"
                value={user.cell}
                onChange={(e) => setUser({ ...user, cell: e.target.value })}
                placeholder="+1 647 000 0000"
              />
            </Field>

            <Field label="Email">
              <input
                className="w-full border rounded-xl p-2"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                placeholder="nirja@email.com"
              />
            </Field>
          </div>

          <button
            className="mt-4 px-4 py-2 rounded-xl bg-black text-white"
            onClick={handleAuthSubmit}
          >
            Continue
          </button>
        </section>
      )}

      {/* STEP 2 */}
      {isAuthed && (
        <section className="mt-6 p-5 border rounded-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">2) How many cards do you have?</h2>
            <button className="text-xs underline text-gray-600" onClick={resetAll}>
              Reset all
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setCardCount(n);
                  // If user lowers the number, trim selected banks
                  setBanks((prev) => prev.slice(0, n));
                  setResult(null);
                  setError(null);
                }}
                className={`px-4 py-2 rounded-xl border ${
                  cardCount === n ? "bg-black text-white" : ""
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Selected: <span className="font-semibold">{cardCount}</span>
          </div>
        </section>
      )}

      {/* STEP 3 */}
      {isAuthed && (
        <section className="mt-6 p-5 border rounded-2xl">
          <h2 className="text-lg font-semibold">3) Which cards (banks) do you have?</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pick exactly <span className="font-semibold">{cardCount}</span> banks.
            (Selected: <span className="font-semibold">{banks.length}</span>)
          </p>

          <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {(["CIBC", "RBC", "Scotiabank", "TD", "BMO"] as Bank[]).map((b) => {
              const selected = banks.includes(b);
              const disabled = !selected && banks.length >= cardCount;
              return (
                <button
                  key={b}
                  onClick={() => toggleBank(b)}
                  disabled={disabled}
                  className={`px-4 py-3 rounded-xl border text-left disabled:opacity-50 ${
                    selected ? "bg-black text-white" : ""
                  }`}
                >
                  <div className="font-semibold">{b}</div>
                  <div className="text-xs opacity-80">
                    {selected ? "Selected" : disabled ? "Limit reached" : "Tap to select"}
                  </div>
                </button>
              );
            })}
          </div>

          {banks.length !== cardCount && (
            <div className="mt-3 text-xs text-amber-700">
              Select {cardCount - banks.length} more to continue.
            </div>
          )}
        </section>
      )}

      {/* STEP 4 */}
      {isAuthed && banks.length === cardCount && (
        <section className="mt-6 p-5 border rounded-2xl">
          <h2 className="text-lg font-semibold">4) What are you spending on today?</h2>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <Field label="Merchant / Category">
              <select
                className="w-full border rounded-xl p-2"
                value={merchant}
                onChange={(e) => {
                  setMerchant(e.target.value as Merchant);
                  setResult(null);
                  setError(null);
                }}
              >
                <option value="Walmart">Walmart</option>
                <option value="FreshCo">FreshCo</option>
                <option value="No Frills">No Frills</option>
                <option value="Loblaws">Loblaws</option>
                <option value="Costco">Costco</option>
                <option value="Independent Grocer">Independent Grocer</option>
                <option value="Canadian Tire">Canadian Tire</option>
                <option value="Transport">Transport</option>
                <option value="Dining">Dining</option>
              </select>
            </Field>

            <div className="p-3 rounded-xl border bg-gray-50 text-sm">
              <div className="font-semibold">Your cards (banks)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {banks.map((b) => (
                  <span key={b} className="text-xs px-2 py-1 rounded-lg border">
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                For now, the backend returns a recommended “card type”. Next, we can map that to the best option among your selected banks.
              </div>
            </div>
          </div>

          <button
            className="mt-4 px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            onClick={getRecommendation}
            disabled={loading || !connected}
          >
            {loading ? "Checking..." : "Get recommendation"}
          </button>

          {result && (
            <div className="mt-5 p-4 rounded-2xl border bg-gray-50">
              <div className="text-sm font-semibold">Recommendation</div>

              {"recommended_card" in result ? (
                <>
                  <div className="mt-2 text-lg font-bold">
                    {result.recommended_card}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">{result.reason}</div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-lg font-bold">{result.use_card}</div>
                  <div className="mt-1 text-sm text-gray-700">{result.reason}</div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 text-xs text-gray-500">
        Tip: This flow uses localStorage for hackathon demo. Later, we’ll store profiles + owned cards in MongoDB.
      </footer>
    </main>
  );
}

function StepBadge({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "px-3 py-2 rounded-xl border",
        done ? "border-green-300 bg-green-50" : active ? "border-black" : "",
      ].join(" ")}
    >
      <div className="font-semibold">{children}</div>
      <div className="mt-1">
        {done ? (
          <span className="text-green-700">Done</span>
        ) : active ? (
          <span className="text-gray-700">Current</span>
        ) : (
          <span className="text-gray-400">Pending</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}