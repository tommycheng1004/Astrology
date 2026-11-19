import type { Metadata } from "next";
import MemberHome from "@/components/MemberHome";

export const metadata: Metadata = { title: "會員中心", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <main id="main" className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-8 sm:px-6"><MemberHome /></main>;
}
