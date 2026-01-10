"use client";

import { useEffect, useState } from "react";

type HealthResp = { status: string; project: string } | null;

type RecommendCardResp = {
  recommended_card: string;
  reason: string;
};

export default function Home() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  const [health, setHealth] = useState<HealthResp>(null);
  const [loading, setLoading] = useState(false);

  const [isStudent, setIsStudent] = useState(true);
  const [primarySpend, setPrimarySpend] = useState("groceries");
  const [priority, setPriority] = useState("cashback");

  const [result, setResult] = useState<RecommendCardResp | null>(null);

  useEffect(() => {
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [base]);

  async function recommend() {
    setLoading(true);
    setResult(null);

    const res = await fetch(`${base}/recommend/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_student: isStudent,
        primary_spend: primarySpend,
        priority,
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">SwipeSense 💳</h1>
      <p className="text-gray-600 mt-2">
        Smart credit card recommendations for Canadian users
      </p>

      <div className="mt-6 p-4 border rounded-xl">
        <div className="font-semibold">Backend status</div>
        <div className="text-sm mt-2">
          {health ? "✅ Connected" : "❌ Not connected"}
        </div>
      </div>

      <div className="mt-6 p-4 border rounded-xl">
        <div className="font-semibold">Your profile</div>

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={isStudent}
            onChange={(e) => setIsStudent(e.target.checked)}
          />
          Student
        </label>

        <div className="mt-4">
          <label>Primary spend</label>
          <select
            className="mt-1 w-full border p-2 rounded"
            value={primarySpend}
            onChange={(e) => setPrimarySpend(e.target.value)}
          >
            <option value="groceries">Groceries</option>
            <option value="travel">Travel</option>
            <option value="dining">Dining</option>
          </select>
        </div>

        <div className="mt-4">
          <label>Priority</label>
          <select
            className="mt-1 w-full border p-2 rounded"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="cashback">Cashback</option>
            <option value="points">Points</option>
          </select>
        </div>

        <button
          onClick={recommend}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          {loading ? "Recommending..." : "Get Recommendation"}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 border rounded-xl bg-gray-50">
          <div className="font-semibold">Recommended Card</div>
          <div className="text-lg mt-1">{result.recommended_card}</div>
          <div className="text-sm text-gray-600">{result.reason}</div>
        </div>
      )}
    </main>
  );
}