import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <Sidebar />
      <main className="md:pl-56">
        <div className="pt-16 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
