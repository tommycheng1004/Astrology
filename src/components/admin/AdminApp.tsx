"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { adminFetch, AdminError } from "@/components/admin/adminApi";
import { AdminsPanel, AuditPanel, MembersPanel, OverviewPanel, SettingsPanel } from "@/components/admin/panels";
import type { AdminSession } from "@/lib/adminTypes";
import { accountServerSnapshot, accountSnapshot, loadAccount, openAccountDialog, signOutAccount, subscribeAccount } from "@/lib/account";

type Tab = "overview" | "members" | "settings" | "audit" | "admins";

const TABS: { id: Tab; label: string; perm: string }[] = [
  { id: "overview", label: "總覽", perm: "dashboard.read" },
  { id: "members", label: "會員", perm: "members.read" },
  { id: "settings", label: "系統設定", perm: "settings.read" },
  { id: "audit", label: "稽核紀錄", perm: "audit.read" },
  { id: "admins", label: "後台人員", perm: "admins.manage" },
];

export default function AdminApp() {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);

  // 後台一定要確認登入狀態（沒有「之前登入過」的提示也要載入 Firebase）
  useEffect(() => {
    if (account.enabled) loadAccount().catch(() => {});
  }, [account.enabled]);

  if (!account.enabled) return <Notice title="會員功能尚未設定">後台需要先完成 Firebase 設定，步驟見 docs/admin.md。</Notice>;
  if (!account.ready) return <Notice title="正在確認登入狀態…" />;
  if (!account.user)
    return (
      <Notice title="請用後台帳號登入">
        <button type="button" className="action-primary mt-4" onClick={openAccountDialog}>登入</button>
      </Notice>
    );
  return <Console key={account.user.uid} email={account.user.email} />;
}

function Console({ email }: { email: string }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    adminFetch<AdminSession>("session")
      .then((s) => alive && setSession(s))
      .catch((e) => alive && setError(e instanceof AdminError ? e : new AdminError("無法連線，請稍後再試。", 0)));
    return () => {
      alive = false;
    };
  }, [attempt]);
  function load() {
    setError(null);
    setAttempt((n) => n + 1);
  }

  if (error)
    return (
      <Notice title={error.status === 404 ? "沒有後台權限" : "無法進入後台"}>
        <p className="mt-2 text-ink-soft">
          {error.status === 404 ? `目前登入的 ${email} 沒有後台權限。請改用管理員帳號登入，或請擁有者指派角色。` : error.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {error.status !== 404 && <button type="button" className="action-secondary" onClick={load}>重試</button>}
          <button type="button" className="action-secondary" onClick={() => void signOutAccount()}>登出，換一個帳號</button>
        </div>
      </Notice>
    );
  if (!session) return <Notice title="正在確認權限…" />;

  const tabs = TABS.filter((t) => session.permissions.includes(t.perm));
  const has = (perm: string) => session.permissions.includes(perm);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-sm text-gold">管理後台</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">營運管理</h1>
        </div>
        <p className="text-sm text-ink-soft">
          {session.email}
          <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{session.roleLabel}</span>
        </p>
      </header>

      <nav aria-label="後台功能" className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 border-b border-line">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] font-medium transition ${
                  tab === t.id ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "overview" && <OverviewPanel />}
        {tab === "members" && <MembersPanel canEditQuota={has("members.quota")} />}
        {tab === "settings" && <SettingsPanel canEdit={has("settings.write")} />}
        {tab === "audit" && <AuditPanel />}
        {tab === "admins" && <AdminsPanel />}
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[32rem] rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="font-serif text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
