"use client";

import { useState } from "react";

interface Result {
    type: "success" | "error" | "info";
    message: string;
    timestamp: string;
}

export default function TestToolsPage() {
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState<string | null>(null);

    const addResult = (type: Result["type"], message: string) => {
        setResults((prev) => [
            { type, message, timestamp: new Date().toLocaleTimeString() },
            ...prev,
        ]);
    };

    // Button 1 — Reset quota via webhook (fresh idempotency key)
    const resetQuota = async () => {
        setLoading("reset");
        const key = `reset-${Date.now()}`;
        const res = await fetch("/api/webhook/reset-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idempotencyKey: key }),
        });
        const data = await res.json();
        addResult("success", `Quota reset: ${data.message} (key: ${key})`);
        setLoading(null);
    };

    // Button 2 — Call webhook multiple times with SAME key (idempotency test)
    const testIdempotency = async () => {
        setLoading("idempotency");
        const key = `idempotency-test-fixed-key`;

        addResult("info", `Calling webhook 5 times with same key: "${key}"`);

        for (let i = 1; i <= 5; i++) {
            const res = await fetch("/api/webhook/reset-quota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idempotencyKey: key }),
            });
            const data = await res.json();
            addResult(
                data.skipped ? "info" : "success",
                `Call ${i}: ${data.message} ${data.skipped ? "⚡ SKIPPED (idempotent)" : "✅ PROCESSED"}`
            );
        }

        setLoading(null);
    };

    // Button 3 — Generate 10 leads simultaneously
    const bulkLeads = async () => {
        setLoading("bulk");
        addResult("info", "Generating 10 leads simultaneously...");
        const res = await fetch("/api/test/bulk-leads", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            addResult("success", `Created ${data.created} leads concurrently — check dashboard!`);
        } else {
            addResult("error", `Error: ${data.error}`);
        }
        setLoading(null);
    };

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                    Test Tools
                </h1>
                <p className="text-sm text-gray-500 mb-8">
                    Internal testing panel — simulates payment webhooks and concurrency
                </p>

                <div className="space-y-4 mb-8">
                    {/* Button 1 */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="font-medium text-gray-800 mb-1">
                            Reset Provider Quota
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Simulates a successful payment — resets all providers quota to 10.
                            Each call uses a unique idempotency key.
                        </p>
                        <button
                            onClick={resetQuota}
                            disabled={loading !== null}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading === "reset" ? "Resetting..." : "Reset Quota → Webhook"}
                        </button>
                    </div>

                    {/* Button 2 */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="font-medium text-gray-800 mb-1">
                            Test Webhook Idempotency
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Calls the webhook 5 times with the same key. Only the first call
                            should process — the rest should be skipped.
                        </p>
                        <button
                            onClick={testIdempotency}
                            disabled={loading !== null}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {loading === "idempotency"
                                ? "Testing..."
                                : "Test Idempotency (5x same key)"}
                        </button>
                    </div>

                    {/* Button 3 */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="font-medium text-gray-800 mb-1">
                            Generate 10 Leads (Concurrency Test)
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Creates 10 leads simultaneously using Promise.all. Tests that
                            advisory locks prevent duplicate or unfair assignments.
                        </p>
                        <button
                            onClick={bulkLeads}
                            disabled={loading !== null}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                            {loading === "bulk" ? "Generating..." : "Generate 10 Leads Now"}
                        </button>
                    </div>
                </div>

                {/* Results log */}
                {results.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-medium text-gray-800">Result Log</h2>
                            <button
                                onClick={() => setResults([])}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {results.map((r, i) => (
                                <div
                                    key={i}
                                    className={`text-xs p-2 rounded-lg ${r.type === "success"
                                            ? "bg-green-50 text-green-700"
                                            : r.type === "error"
                                                ? "bg-red-50 text-red-700"
                                                : "bg-blue-50 text-blue-700"
                                        }`}
                                >
                                    <span className="text-gray-400 mr-2">{r.timestamp}</span>
                                    {r.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}