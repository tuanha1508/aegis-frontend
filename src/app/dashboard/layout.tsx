import { Sidebar } from "@/components/dashboard/sidebar";
import { AlertBanner } from "@/components/dashboard/alert-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-52">
        <AlertBanner />
        <div className="pt-16 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
