import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminSide() {
  if (!erLoggetInd()) {
    return <AdminLogin />;
  }
  const fejl = queries.alleFejl.all();
  return <AdminDashboard fejl={fejl} />;
}
