import DashboardSidebar from '@/components/DashboardSidebar';

export default function AraclarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-surface-base text-on-surface">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 lg:pl-0">
        {children}
      </div>
    </div>
  );
}
