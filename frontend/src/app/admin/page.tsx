"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");

  // Ingest Form States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [ingestStatus, setIngestStatus] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState(false);

  // Clear Storage Form States
  const [clearRedis, setClearRedis] = useState(false);
  const [clearPinecone, setClearPinecone] = useState(false);
  const [clearStatus, setClearStatus] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState(false);

  const RAW_BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const BACKEND_URL = RAW_BACKEND_URL.replace(/['"]+/g, "").replace(/\/+$/, "");

  // Handle Batch Ingestion
  const handleTriggerIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestLoading(true);
    setIngestStatus("");
    setIngestError(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/bulk-ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminKey,
        },
        body: JSON.stringify({
          page: Number(page),
          books_per_category: Number(limit),
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "Failed to trigger batch ingestion.");
      setIngestStatus(data.message);
    } catch (err: any) {
      setIngestError(true);
      setIngestStatus(err.message);
    } finally {
      setIngestLoading(false);
    }
  };

  // Handle Clear Storage
  const handleClearStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearRedis && !clearPinecone) {
      setClearError(true);
      setClearStatus("Please select at least one database to clear.");
      return;
    }

    const confirmMsg = `Are you sure you want to delete:${clearRedis ? "\n- Upstash Redis Cache" : ""}${clearPinecone ? "\n- Pinecone Vector Index" : ""}`;
    if (!window.confirm(confirmMsg)) return;

    setClearLoading(true);
    setClearStatus("");
    setClearError(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/clear-storage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminKey,
        },
        body: JSON.stringify({
          clear_redis: clearRedis,
          clear_pinecone: clearPinecone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to clear storage.");
      setClearStatus(data.message);
      setClearRedis(false);
      setClearPinecone(false);
    } catch (err: any) {
      setClearError(true);
      setClearStatus(err.message);
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1c1917] text-stone-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans select-none">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="bg-[#292524] border-2 border-stone-600 rounded-xl p-6 shadow-xl flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-amber-400 font-mono tracking-wide">
              ⚡ Admin Operations Center
            </h1>
            <p className="text-stone-400 text-xs mt-1">
              Manage database state, cached entries, and background ingestion.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs uppercase font-bold tracking-wider px-3 py-1.5 border border-stone-600 rounded hover:bg-stone-800 text-stone-300 transition"
          >
            ← Reader
          </Link>
        </div>

        {/* Global Admin Key Field */}
        <div className="bg-[#292524] border border-stone-700 rounded-xl p-5 shadow-lg">
          <label className="block uppercase font-bold tracking-wider text-xs text-stone-300 mb-2">
            🔑 Admin Passphrase
          </label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter secure admin key (required for all actions)"
            className="w-full bg-[#1c1917] border border-stone-700 rounded-lg p-3 text-stone-200 outline-none focus:border-amber-500 text-xs"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Bulk Ingestion */}
          <div className="bg-[#292524] border border-stone-700 rounded-xl p-6 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-mono mb-1">
                📥 Batch Ingest Books
              </h2>
              <p className="text-stone-400 text-xs mb-4">
                Fetch and index new public-domain books from Project Gutenberg.
              </p>

              <form
                onSubmit={handleTriggerIngest}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-300 mb-1">
                      API Page
                    </label>
                    <input
                      type="number"
                      value={page}
                      onChange={(e) =>
                        setPage(Math.max(1, Number(e.target.value)))
                      }
                      min={1}
                      className="w-full bg-[#1c1917] border border-stone-700 rounded-lg p-2 text-stone-200 text-center outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-300 mb-1">
                      Books / Category
                    </label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) =>
                        setLimit(Math.max(1, Number(e.target.value)))
                      }
                      min={1}
                      max={10}
                      className="w-full bg-[#1c1917] border border-stone-700 rounded-lg p-2 text-stone-200 text-center outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ingestLoading || !adminKey}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-2.5 rounded-lg uppercase tracking-wider text-xs transition disabled:opacity-40 mt-2"
                >
                  {ingestLoading ? "Starting Batch..." : "🚀 Trigger Ingest"}
                </button>
              </form>
            </div>

            {ingestStatus && (
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  ingestError
                    ? "bg-rose-950/60 border border-rose-800 text-rose-300"
                    : "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                }`}
              >
                {ingestStatus}
              </div>
            )}
          </div>

          {/* Action 2: Reset Storage */}
          <div className="bg-[#292524] border border-rose-900/50 rounded-xl p-6 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 font-mono mb-1">
                🗑️ Storage Reset
              </h2>
              <p className="text-stone-400 text-xs mb-4">
                Selectively purge cached book text, character lists, or vectors.
              </p>

              <form onSubmit={handleClearStorage} className="space-y-3 text-xs">
                <div className="space-y-2 bg-[#1c1917] p-3 rounded-lg border border-stone-800">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearRedis}
                      onChange={(e) => setClearRedis(e.target.checked)}
                      className="rounded accent-rose-500 cursor-pointer"
                    />
                    <span className="text-stone-300 font-medium">
                      Upstash Redis (Text, POVs, Chars)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearPinecone}
                      onChange={(e) => setClearPinecone(e.target.checked)}
                      className="rounded accent-rose-500 cursor-pointer"
                    />
                    <span className="text-stone-300 font-medium">
                      Pinecone Index (All Vectors)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={
                    clearLoading || !adminKey || (!clearRedis && !clearPinecone)
                  }
                  className="w-full bg-rose-700 hover:bg-rose-600 text-white font-bold py-2.5 rounded-lg uppercase tracking-wider text-xs transition disabled:opacity-40 mt-2"
                >
                  {clearLoading
                    ? "Clearing Storage..."
                    : "⚠️ Reset Selected Storage"}
                </button>
              </form>
            </div>

            {clearStatus && (
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  clearError
                    ? "bg-rose-950/60 border border-rose-800 text-rose-300"
                    : "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                }`}
              >
                {clearStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
