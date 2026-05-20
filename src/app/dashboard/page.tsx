"use client";

import { useEffect, useState } from "react";

interface Lead {
    id: number;
    name: string;
    city: string;
    service: { name: string };
    createdAt: string;
}

interface Provider {
    id: number;
    name: string;
    monthlyQuota: number;
    leadsReceived: number;
    assignments: { lead: Lead }[];
}

export default function DashboardPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    const fetchProviders = async () => {
        const res = await fetch("/api/providers");
        const data = await res.json();
        setProviders(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
    };

    useEffect(() => {
        fetchProviders();

        // SSE — listen for real-time updates
        const es = new EventSource("/api/sse");
        es.onmessage = (e) => {
            if (e.data === "update") {
                fetchProviders();
            }
        };
        es.onerror = () => es.close();

        return () => es.close();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Provider Dashboard
                    </h1>
                    <span className="text-xs text-gray-400">
                        Last updated: {lastUpdated}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.map((provider) => {
                        const remaining = provider.monthlyQuota - provider.leadsReceived;
                        const pct = (provider.leadsReceived / provider.monthlyQuota) * 100;

                        return (
                            <div
                                key={provider.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="font-semibold text-gray-800">{provider.name}</h2>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${remaining === 0
                                                ? "bg-red-100 text-red-600"
                                                : "bg-green-100 text-green-600"
                                            }`}
                                    >
                                        {remaining === 0 ? "Quota Full" : `${remaining} left`}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>

                                <p className="text-xs text-gray-500 mb-4">
                                    {provider.leadsReceived} / {provider.monthlyQuota} leads used
                                </p>

                                {/* Leads list */}
                                <div className="space-y-2">
                                    {provider.assignments.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No leads yet</p>
                                    ) : (
                                        provider.assignments.map(({ lead }) => (
                                            <div
                                                key={lead.id}
                                                className="bg-gray-50 rounded-lg p-2 text-xs"
                                            >
                                                <div className="font-medium text-gray-700">
                                                    {lead.name}
                                                </div>
                                                <div className="text-gray-400">
                                                    {lead.service.name} · {lead.city}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}