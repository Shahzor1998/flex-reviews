"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";


const fetcher = (url: string) => fetch(url).then(r => r.json());


type R = {
    extId: string; provider: string; type: string; status: string; rating: number | null;
    categories: Record<string, number | null> | null; submittedAt: string; author: string | null;
    text: string | null; listingName: string; approved?: boolean;
};


export default function Dashboard() {
    const { data } = useSWR<{ reviews: R[] }>("/api/reviews/hostaway", fetcher, { refreshInterval: 0 });
    const [q, setQ] = useState("");
    const [onlyUnapproved, setOnlyUnapproved] = useState(false);


    const filtered = useMemo(() => {
        let arr = data?.reviews || [];
        if (q) {
            const needle = q.toLowerCase();
            arr = arr.filter(r =>
                r.listingName.toLowerCase().includes(needle) ||
                (r.text || "").toLowerCase().includes(needle) ||
                (r.author || "").toLowerCase().includes(needle)
            );
        }
        if (onlyUnapproved) arr = arr.filter(r => !r.approved);
        return arr;
    }, [data, q, onlyUnapproved]);


    async function toggle(extId: string, approved: boolean) {
        await fetch("/api/reviews/approve", { method: "POST", body: JSON.stringify({ extId, approved }) });
        location.reload();
    }


    return (
        <main className="p-6 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Reviews Dashboard</h1>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reviews..." className="border p-2 rounded w-72" />
            </header>


            <label className="flex items-center gap-2"><input type="checkbox" checked={onlyUnapproved} onChange={e => setOnlyUnapproved(e.target.checked)} />Show only unapproved</label>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(r => (
                    <article key={r.extId} className="border rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">{r.listingName}</h3>
                            <span className="text-sm opacity-70">{new Date(r.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm">{r.text || "(no text)"}</p>
                        <div className="mt-2 text-xs opacity-70">by {r.author || "Anonymous"}</div>
                        <div className="mt-2 text-sm">Rating: {r.rating ?? "—"}</div>
                        {r.categories && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(r.categories).map(([k, v]) => (
                                    <span key={k} className="text-xs border rounded px-2 py-0.5">{k}: {v ?? "—"}</span>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => toggle(r.extId, true)} className="px-3 py-1 rounded bg-black text-white">Approve</button>
                            <button onClick={() => toggle(r.extId, false)} className="px-3 py-1 rounded border">Unapprove</button>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}