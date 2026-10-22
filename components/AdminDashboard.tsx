'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fejl } from '@/lib/db';
import { STATUSSER } from '@/lib/config';
import StatusTag from '@/components/StatusTag';

export default function AdminDashboard({ fejl }: { fejl: Fejl[] }) {
  const router = useRouter();
  const [top, setTop] = useState(20);
  const [travl, setTravl] = useState<number | null>(null);

  async function skiftStatus(id: number, status: string) {
    setTravl(id);
    try {
      await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      router.refresh();
    } finally {
      setTravl(null);
    }
  }

  async function slet(id: number, titel: string) {
    if (!confirm(`Slet bygherren "${titel}" permanent? Dette kan ikke fortrydes.`)) return;
    setTravl(id);
    try {
      await fetch('/api/admin/slet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setTravl(null);
    }
  }

  async function logUd() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-asfalt-900">
            🏗️ Byggeledelse (admin)
          </h1>
          <p className="text-sm text-asfalt-500">{fejl.length} bygherrer i databasen.</p>
        </div>
        <button onClick={logUd} className="btn-ghost text-sm">Log ud</button>
      </div>

      {/* Eksport-panel */}
      <div className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">📤 Eksport til Zeekr-importør</h2>
        <p className="mt-1 text-sm text-asfalt-500">
          Generér en rapport med de mest upvotede bygherrer — klar til at sende videre.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="top" className="label">Antal (top)</label>
            <select
              id="top"
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
              className="input !w-28"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
          <a href={`/api/admin/export?top=${top}`} className="btn-primary">
            📄 Download PDF-rapport
          </a>
          <a href={`/api/admin/export/csv?top=${top}`} className="btn-secondary">
            📊 Download CSV
          </a>
        </div>
      </div>

      {/* Fejl-tabel */}
      <div className="kort mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-asfalt-200 text-left text-asfalt-500">
              <th className="p-3">▲</th>
              <th className="p-3">Titel</th>
              <th className="p-3">Model / Version</th>
              <th className="p-3">Status</th>
              <th className="p-3">Skift status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {fejl.map((f) => (
              <tr key={f.id} className="border-b border-asfalt-100 align-top">
                <td className="p-3 font-black text-asfalt-800">{f.stemmer}</td>
                <td className="p-3">
                  <a href={`/fejl/${f.id}`} className="font-bold text-asfalt-900 hover:text-hjelm-700">
                    {f.titel}
                  </a>
                </td>
                <td className="p-3 text-asfalt-500">
                  <div>{f.bilmodel}</div>
                  <div className="font-mono text-xs">{f.softwareversion}</div>
                </td>
                <td className="p-3"><StatusTag status={f.status} /></td>
                <td className="p-3">
                  <select
                    value={f.status}
                    onChange={(e) => skiftStatus(f.id, e.target.value)}
                    disabled={travl === f.id}
                    className="rounded border-2 border-asfalt-200 px-2 py-1 text-xs"
                  >
                    {STATUSSER.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => slet(f.id, f.titel)}
                    disabled={travl === f.id}
                    className="text-xs font-bold text-murstensroed hover:underline"
                  >
                    Slet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
