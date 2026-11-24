import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

/** 管理後台。頁面本身是靜態外殼，所有資料都由 /api/admin/* 在伺服器端驗證身分與角色後才回傳 */
export const metadata: Metadata = { title: "管理後台", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-8 sm:px-6">
      <AdminApp />
    </main>
  );
}
