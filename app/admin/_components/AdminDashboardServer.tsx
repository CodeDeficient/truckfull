// app/admin/_components/AdminDashboardServer.tsx
import { checkAdminAccessServer } from '@/lib/auth/adminAuthHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import Link from '@/components/navigation/IntentLink';

interface DashboardData {
  totalFoodTrucks: number;
  totalUsers: number;
  pendingVerifications: number;
  adminUsers: number;
}

function renderDashboardContent(
  dataError: string | undefined,
  dashboardData: DashboardData | undefined,
) {
  if (dataError != undefined) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-red-800">Data Loading Error</h3>
        <p className="text-red-700">{dataError}</p>
      </div>
    );
  }

  if (dashboardData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Food Trucks</h3>
          <p className="text-3xl font-bold text-blue-600">{dashboardData.totalFoodTrucks}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
          <p className="text-3xl font-bold text-green-600">{dashboardData.totalUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Pending Verifications</h3>
          <p className="text-3xl font-bold text-yellow-600">{dashboardData.pendingVerifications}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Admin Users</h3>
          <p className="text-3xl font-bold text-purple-600">{dashboardData.adminUsers}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium text-blue-800">Loading Dashboard Data</h3>
      <p className="text-blue-700">Please wait while we fetch the latest statistics...</p>
    </div>
  );
}

export default async function AdminDashboardServer() {
  // Check admin access
  const authResult = await checkAdminAccessServer();

  if (!authResult.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-4">{authResult.error}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-200"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Fetch dashboard data
  let dashboardData: DashboardData | undefined;
  let dataError: string | undefined;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get food truck count
    const { count: foodTruckCount, error: foodTruckError } = await supabaseAdmin
      .from('food_trucks')
      .select('*', { count: 'exact', head: true });

    // Get user count
    const { count: userCount, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get pending verifications
    const { count: pendingCount, error: pendingError } = await supabaseAdmin
      .from('food_trucks')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    // Get admin users
    const { count: adminCount, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (foodTruckError || userError || pendingError || adminError) {
      dataError = 'Failed to load dashboard data';
    } else {
      dashboardData = {
        totalFoodTrucks: foodTruckCount ?? 0,
        totalUsers: userCount ?? 0,
        pendingVerifications: pendingCount ?? 0,
        adminUsers: adminCount ?? 0,
      };
    }
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Unknown error loading data';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome, {authResult.email} ({authResult.role})
          </p>
        </div>

        {renderDashboardContent(dataError, dashboardData)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Management</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/food-trucks" className="text-blue-600 hover:text-blue-800">
                  Manage Food Trucks
                </Link>
              </li>
              <li>
                <Link href="/admin/users" className="text-blue-600 hover:text-blue-800">
                  Manage Users
                </Link>
              </li>
              <li>
                <Link href="/admin/verifications" className="text-blue-600 hover:text-blue-800">
                  Review Verifications
                </Link>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Pipeline</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/data-processing" className="text-blue-600 hover:text-blue-800">
                  Data Processing
                </Link>
              </li>
              <li>
                <Link href="/admin/quality-reports" className="text-blue-600 hover:text-blue-800">
                  Quality Reports
                </Link>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800">
                  System Settings
                </Link>
              </li>
              <li>
                <Link href="/admin/logs" className="text-blue-600 hover:text-blue-800">
                  Audit Logs
                </Link>
              </li>
              <li>
                <Link href="/admin/monitoring" className="text-blue-600 hover:text-blue-800">
                  System Monitoring
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
