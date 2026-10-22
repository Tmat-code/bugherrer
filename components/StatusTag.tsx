import { STATUS_STYLE, type Status } from '@/lib/config';

export default function StatusTag({ status }: { status: string }) {
  const style =
    STATUS_STYLE[status as Status] ?? {
      bg: 'bg-asfalt-200',
      text: 'text-asfalt-800',
      ikon: '❓',
    };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}
    >
      <span aria-hidden>{style.ikon}</span>
      {status}
    </span>
  );
}
