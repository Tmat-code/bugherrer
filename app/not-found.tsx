import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden>🚧</p>
      <h1 className="mt-4 text-2xl font-black text-asfalt-900">
        404 — Byggegrunden er tom
      </h1>
      <p className="mt-2 text-asfalt-500">
        Den bugherre eller side findes ikke (eller er allerede revet ned).
      </p>
      <Link href="/" className="btn-primary mt-6">
        Tilbage til listen
      </Link>
    </div>
  );
}
