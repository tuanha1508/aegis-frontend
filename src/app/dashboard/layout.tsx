import { Sidebar } from "@/components/dashboard/sidebar";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { DashboardProvider } from "@/lib/dashboard-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-52">
          <AlertBanner />
          <div className="pt-16 md:pt-0">{children}</div>
        </main>
      </div>
    </DashboardProvider>
  );
}
