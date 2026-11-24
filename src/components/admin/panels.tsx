"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { adminFetch, adminWrite, formatTime, providerLabel } from "@/components/admin/adminApi";
import type { AdminConfig, AdminOverview, AdminRole, AdminRow, AuditRow, MemberDetail, MemberRow } from "@/lib/adminTypes";

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-paper/60 px-3 text-base text-ink placeholder:text-muted transition focus:border-accent focus:bg-surface focus:outline-none";

/* ───────────── 共用 ───────────── */

function useLoad<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    adminFetch<T>(path)
      .then((data) => alive && setState({ data, error: "", loading: false }))
      .catch((e: Error) => alive && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => {
      alive = false;
    };
  }, [path, revision]);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setRevision((r) => r + 1);
  }, []);
  return { ...state, reload };
}

/**
 * 分頁清單：req 每變一次就讀一次；loading 由「最後完成的請求編號」推算，effect 裡不直接改 state。
 * after 有值時接在現有清單後面（載入更多），否則取代（新搜尋、重試）。
 */
function usePaged<T>(listKey: string, cursorParam: string) {
  const [req, setReq] = useState<{ path: string; after?: string; n: number }>({ path: "", n: 0 });
  const [res, setRes] = useState<{ n: number; items: T[]; more: boolean; error: string }>({ n: -1, items: [], more: false, error: "" });
  useEffect(() => {
    if (!req.path) return;
    let alive = true;
    const sep = req.path.includes("?") ? "&" : "?";
    const url = req.after ? `${req.path}${sep}${cursorParam}=${encodeURIComponent(req.after)}` : req.path;
    adminFetch<Record<string, unknown> & { more: boolean }>(url)
      .then((d) => alive && setRes((prev) => ({ n: req.n, items: req.after ? [...prev.items, ...(d[listKey] as T[])] : (d[listKey] as T[]), more: d.more, error: "" })))
      .catch((e: Error) => alive && setRes((prev) => ({ ...prev, n: req.n, error: e.message })));
    return () => {
      alive = false;
    };
  }, [req, listKey, cursorParam]);
  const open = useCallback((path: string) => setReq((r) => ({ path, n: r.n + 1 })), []);
  const loadMore = useCallback((after?: string) => setReq((r) => ({ path: r.path, after, n: r.n + 1 })), []);
  const retry = useCallback(() => setReq((r) => ({ ...r, n: r.n + 1 })), []);
  return { ...res, loading: !!req.path && res.n !== req.n, open, loadMore, retry };
}

function Loading() {
  return <p role="status" className="text-ink-soft">讀取中…</p>;
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-ji/40 bg-ji/5 p-4 text-[15px] text-ink">
      {message}
      {onRetry && <button type="button" className="action-text ml-2" onClick={onRetry}>重試</button>}
    </div>
  );
}

function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** 修改原因：每一筆修改都要寫，會存進稽核紀錄 */
function ReasonField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">修改原因<span className="ml-1 font-normal text-muted">（必填，會記錄在稽核紀錄）</span></label>
      <input id={id} className={`${inputClass} mt-1.5`} value={value} maxLength={200} onChange={(e) => onChange(e.target.value)} placeholder="例如：會員來信反映題數不夠用" />
    </div>
  );
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: success });
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const view = message && (
    <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-ji" : "text-lu"}`}>
      {message.text}
    </p>
  );
  return { busy, run, view };
}

const nf = new Intl.NumberFormat("zh-TW");

/* ───────────── 總覽 ───────────── */

export function OverviewPanel() {
  const { data, error, loading, reload } = useLoad<AdminOverview>("overview");
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const today = data.days[0];
  const tiles = [
    { label: "會員總數", value: data.members.total },
    { label: "近 7 天新會員", value: data.members.new7d },
    { label: "近 7 天活躍會員", value: data.members.active7d },
    { label: "會員存的命盤", value: data.charts },
    { label: "會員報告", value: data.reports },
    { label: "今天 AI 提問", value: today.questionsMember + today.questionsGuest, note: `會員 ${today.questionsMember}・訪客 ${today.questionsGuest}` },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[15px] ${data.config.aiEnabled ? "text-ink-soft" : "font-bold text-ji"}`}>
          AI 問答{data.config.aiEnabled ? "開啟中" : "已暫停"}・每日題數：訪客 {data.config.dailyGuest} 題、會員 {data.config.dailyMember} 題
        </p>
        <button type="button" className="action-secondary" onClick={reload} disabled={loading}>{loading ? "更新中…" : "重新整理"}</button>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-serif text-3xl font-bold tabular-nums">{nf.format(t.value)}</p>
            {t.note && <p className="mt-1 text-xs text-muted">{t.note}</p>}
          </li>
        ))}
      </ul>
      <Card title="近 14 天">
        <div className="-mx-5 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[22rem] text-left text-[15px] tabular-nums">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-2 font-medium sm:px-2">日期</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">會員提問</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">訪客提問</th>
                <th scope="col" className="px-5 py-2 text-right font-medium sm:px-2">新會員</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.date} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="px-5 py-2 font-normal text-ink-soft sm:px-2">{d.date.slice(5).replace("-", "/")}</th>
                  <td className="px-2 py-2 text-right">{d.questionsMember}</td>
                  <td className="px-2 py-2 text-right">{d.questionsGuest}</td>
                  <td className="px-5 py-2 text-right sm:px-2">{d.newMembers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">日期以台灣時間計算。提問數不含命中快取的建議問題；從後台上線那天開始統計。</p>
      </Card>
    </div>
  );
}

/* ───────────── 會員 ───────────── */

export function MembersPanel({ canEditQuota }: { canEditQuota: boolean }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = usePaged<MemberRow>("members", "after");
  const { open } = list;
  useEffect(() => open(q ? `members?q=${encodeURIComponent(q)}` : "members"), [q, open]);

  if (selected) return <MemberDetailView uid={selected} canEditQuota={canEditQuota} onBack={() => setSelected(null)} />;

  function search(e: FormEvent) {
    e.preventDefault();
    setQ(input.trim());
  }
  const rows = list.items;

  return (
    <div className="space-y-4">
      <form role="search" onSubmit={search} className="flex gap-2">
        <label htmlFor="member-q" className="sr-only">搜尋會員</label>
        <input id="member-q" type="search" className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Email 開頭或會員 ID" autoComplete="off" />
        <button type="submit" className="action-primary shrink-0 px-5">搜尋</button>
      </form>
      <p className="text-sm text-muted">{q ? `「${q}」的搜尋結果` : "依最近使用時間排序"}。會員第一次登入使用後才會出現在這裡。</p>
      {list.error && <ErrorBox message={list.error} onRetry={list.retry} />}
      {!list.error && !list.loading && rows.length === 0 && <p className="rounded-2xl border border-line bg-surface p-5 text-ink-soft">找不到符合的會員。</p>}
      {rows.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((m) => (
            <li key={m.uid}>
              <button type="button" onClick={() => setSelected(m.uid)} className="grid w-full gap-1 px-5 py-3.5 text-left transition hover:bg-surface-2/50 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{m.email || "（沒有 Email）"}</span>
                  <span className="block truncate text-sm text-muted">
                    {m.name || "未提供名稱"}・{providerLabel(m.provider)}
                    {!m.verified && <span className="text-quan">・Email 未驗證</span>}
                    {m.dailyLimit !== null && <span className="text-accent">・個人題數 {m.dailyLimit}</span>}
                  </span>
                </span>
                <span className="text-sm text-ink-soft tabular-nums">最近使用 {formatTime(m.lastSeen)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.loading && <Loading />}
      {list.more && !list.loading && (
        <button type="button" className="action-secondary w-full" onClick={() => list.loadMore(rows.at(-1)?.lastSeen)}>載入更多</button>
      )}
    </div>
  );
}

function MemberDetailView({ uid, canEditQuota, onBack }: { uid: string; canEditQuota: boolean; onBack: () => void }) {
  const { data, error, reload } = useLoad<MemberDetail>(`members/${encodeURIComponent(uid)}`);
  return (
    <div className="space-y-4">
      <button type="button" className="action-text -ml-3" onClick={onBack}>← 回會員列表</button>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <Card title={data.email || "（沒有 Email）"}>
            <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
              <Item label="名稱">{data.name || "—"}</Item>
              <Item label="登入方式">{providerLabel(data.provider)}</Item>
              <Item label="Email 驗證">{data.verified ? "已驗證" : <span className="text-quan">未驗證（AI 題數比照訪客）</span>}</Item>
              <Item label="會員 ID"><span className="break-all font-mono text-sm">{data.uid}</span></Item>
              <Item label="第一次使用">{formatTime(data.firstSeen)}</Item>
              <Item label="最近使用">{formatTime(data.lastSeen)}</Item>
              <Item label="存的命盤">{data.charts} 張</Item>
              <Item label="會員報告">{data.reports} 份</Item>
              <Item label="AI 提問">
                {data.usage.map((u) => `${u.date.slice(5).replace("-", "/")}：${u.count} 題`).join("；")}
              </Item>
              <Item label="每日可問">{data.effectiveLimit} 題{data.dailyLimit === null ? "（全站設定）" : "（個人設定）"}</Item>
            </dl>
            <p className="mt-4 text-xs text-muted">依隱私設計，後台只看得到命盤與報告的數量，看不到會員的生辰、命盤內容或提問內容。</p>
          </Card>
          {canEditQuota && <QuotaEditor member={data} onSaved={reload} />}
        </>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

function QuotaEditor({ member, onSaved }: { member: MemberDetail; onSaved: () => void }) {
  const [custom, setCustom] = useState(member.dailyLimit !== null);
  const [value, setValue] = useState(String(member.dailyLimit ?? member.effectiveLimit));
  const [reason, setReason] = useState("");
  const { busy, run, view } = useSubmit();

  async function save(e: FormEvent) {
    e.preventDefault();
    const dailyLimit = custom ? Number(value) : null;
    const ok = await run(() => adminWrite(`members/${encodeURIComponent(member.uid)}`, { method: "PATCH", body: { dailyLimit, reason } }), "已更新每日題數。");
    if (ok) {
      setReason("");
      onSaved();
    }
  }

  return (
    <Card title="調整每日 AI 題數">
      <form onSubmit={save} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">題數來源</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="radio" name="quota" checked={!custom} onChange={() => setCustom(false)} className="size-5 accent-accent" />
            沿用全站設定
          </label>
          <label className="flex min-h-11 flex-wrap items-center gap-3">
            <input type="radio" name="quota" checked={custom} onChange={() => setCustom(true)} className="size-5 accent-accent" />
            這位會員每天
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                aria-label="每日題數"
                disabled={!custom}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`${inputClass} w-24 tabular-nums disabled:opacity-50`}
              />
              題
            </span>
          </label>
        </fieldset>
        <ReasonField id="quota-reason" value={reason} onChange={setReason} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="action-primary px-5" disabled={busy || reason.trim().length < 2}>{busy ? "儲存中…" : "儲存"}</button>
          {view}
        </div>
      </form>
    </Card>
  );
}

/* ───────────── 系統設定 ───────────── */

export function SettingsPanel({ canEdit }: { canEdit: boolean }) {
  const { data, error, reload } = useLoad<{ config: AdminConfig; defaults: AdminConfig }>("settings");
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return <SettingsForm key={data.config.updatedAt ?? "default"} config={data.config} defaults={data.defaults} canEdit={canEdit} onSaved={reload} />;
}

function SettingsForm({ config, defaults, canEdit, onSaved }: { config: AdminConfig; defaults: AdminConfig; canEdit: boolean; onSaved: () => void }) {
  const [aiEnabled, setAiEnabled] = useState(config.aiEnabled);
  const [guest, setGuest] = useState(String(config.dailyGuest));
  const [member, setMember] = useState(String(config.dailyMember));
  const [reason, setReason] = useState("");
  const { busy, run, view } = useSubmit();

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => adminWrite("settings", { method: "PUT", body: { aiEnabled, dailyGuest: Number(guest), dailyMember: Number(member), reason } }),
      "設定已儲存，約 30 秒內全站生效。",
    );
    if (ok) onSaved();
  }

  return (
    <Card
      title="AI 問答"
      aside={<p className="text-sm text-muted">{config.updatedAt ? `${formatTime(config.updatedAt)} 由 ${config.updatedBy} 修改` : "目前使用環境變數的預設值"}</p>}
    >
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={!canEdit} className="space-y-5">
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
            <span>
              <span className="font-medium text-ink">開放 AI 問答</span>
              <span className="block text-sm text-ink-soft">關閉後伺服器立刻停止呼叫 AI，前台會顯示「暫停服務」。費用異常或模型出問題時使用。</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="guest" label="訪客每天可問" value={guest} onChange={setGuest} max={50} hint={`預設 ${defaults.dailyGuest} 題；未驗證 Email 的會員也算訪客`} />
            <NumberField id="member" label="會員每天可問" value={member} onChange={setMember} max={500} hint={`預設 ${defaults.dailyMember} 題；個人設定優先`} />
          </div>
          {canEdit && <ReasonField id="settings-reason" value={reason} onChange={setReason} />}
        </fieldset>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="action-primary px-5" disabled={busy || reason.trim().length < 2}>{busy ? "儲存中…" : "儲存設定"}</button>
            {view}
          </div>
        ) : (
          <p className="text-sm text-muted">你的角色只能檢視設定。</p>
        )}
      </form>
    </Card>
  );
}

function NumberField({ id, label, value, onChange, max, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; hint: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}（題）</label>
      <input id={id} type="number" inputMode="numeric" min={0} max={max} required value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1.5 tabular-nums`} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

/* ───────────── 稽核紀錄 ───────────── */

export function AuditPanel() {
  const list = usePaged<AuditRow>("entries", "before");
  const { open } = list;
  useEffect(() => open("audit"), [open]);
  const { items: entries, error, loading, more } = list;
  const fetchPage = (before?: string) => (before ? list.loadMore(before) : list.retry());

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">後台每一筆修改都會留下紀錄，紀錄只能新增，不能修改或刪除。</p>
      {error && <ErrorBox message={error} onRetry={() => void fetchPage()} />}
      {!error && !loading && entries.length === 0 && <p className="rounded-2xl border border-line bg-surface p-5 text-ink-soft">還沒有任何後台操作。</p>}
      {entries.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-ink">{e.actionLabel}<span className="ml-2 font-normal text-ink-soft">{e.target}</span></p>
                <p className="text-sm text-muted tabular-nums">{formatTime(e.at)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                <span className="tabular-nums">{describe(e.before, e.action)}</span> → <span className="tabular-nums">{describe(e.after, e.action)}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">原因：{e.reason}</p>
              <p className="mt-1 text-xs text-muted">{e.actorEmail}（{ROLE_TEXT[e.actorRole] ?? e.actorRole}）</p>
            </li>
          ))}
        </ol>
      )}
      {loading && <Loading />}
      {more && !loading && <button type="button" className="action-secondary w-full" onClick={() => void fetchPage(entries.at(-1)?.at)}>載入更早的紀錄</button>}
    </div>
  );
}

const ROLE_TEXT: Record<string, string> = { owner: "擁有者", admin: "管理員", support: "客服", viewer: "唯讀" };
const FIELD_TEXT: Record<string, string> = { aiEnabled: "AI 開放", dailyGuest: "訪客題數", dailyMember: "會員題數" };

/** 稽核紀錄的前後值轉成好讀的文字 */
function describe(json: string, action: string) {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return json;
  }
  if (value === null) return action === "member.quota" ? "全站設定" : "（無）";
  if (typeof value === "string") return ROLE_TEXT[value] ?? value;
  if (typeof value !== "object") return String(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${FIELD_TEXT[k] ?? k} ${v === true ? "開" : v === false ? "關" : String(v)}`)
    .join("、");
}

/* ───────────── 後台人員 ───────────── */

export function AdminsPanel() {
  const { data, error, reload } = useLoad<{ admins: AdminRow[]; assignable: { role: AdminRole; label: string }[] }>("admins");
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="space-y-6">
      <Card title="目前的後台人員">
        <ul className="divide-y divide-line">
          {data.admins.map((a) => (
            <AdminItem key={a.uid ?? a.email} admin={a} onChanged={reload} />
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">擁有者由伺服器環境變數 ADMIN_OWNER_EMAILS 設定，無法在後台變更。</p>
      </Card>
      <GrantForm assignable={data.assignable} onSaved={reload} />
    </div>
  );
}

function AdminItem({ admin, onChanged }: { admin: AdminRow; onChanged: () => void }) {
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, run, view } = useSubmit();

  async function remove(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => adminWrite("admins", { method: "DELETE", body: { uid: admin.uid, reason } }), "已移除。");
    if (ok) onChanged();
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{admin.email}</p>
          <p className="text-sm text-muted">
            {admin.roleLabel}
            {admin.grantedBy && `・${formatTime(admin.grantedAt)} 由 ${admin.grantedBy} 指派`}
          </p>
        </div>
        {admin.uid && !removing && <button type="button" className="action-secondary" onClick={() => setRemoving(true)}>移除</button>}
      </div>
      {removing && (
        <form onSubmit={remove} className="mt-3 space-y-3 rounded-xl bg-surface-2/60 p-4">
          <ReasonField id={`revoke-${admin.uid}`} value={reason} onChange={setReason} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="action-primary" disabled={busy || reason.trim().length < 2}>{busy ? "處理中…" : "確定移除"}</button>
            <button type="button" className="action-text" onClick={() => setRemoving(false)}>取消</button>
            {view}
          </div>
        </form>
      )}
    </li>
  );
}

function GrantForm({ assignable, onSaved }: { assignable: { role: AdminRole; label: string }[]; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("support");
  const [reason, setReason] = useState("");
  const { busy, run, view } = useSubmit();

  async function grant(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => adminWrite("admins", { method: "POST", body: { email, role, reason } }), `已將 ${email} 設為${assignable.find((a) => a.role === role)?.label}。`);
    if (ok) {
      setEmail("");
      setReason("");
      onSaved();
    }
  }

  return (
    <Card title="指派或變更角色">
      <form onSubmit={grant} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div>
            <label htmlFor="grant-email" className="text-sm font-medium text-ink">Email</label>
            <input id="grant-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="grant-role" className="text-sm font-medium text-ink">角色</label>
            <select id="grant-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={`${inputClass} mt-1.5`}>
              {assignable.map((a) => (
                <option key={a.role} value={a.role}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="space-y-1 text-sm text-ink-soft">
          <li>・管理員：系統設定、會員題數、稽核紀錄</li>
          <li>・客服：查會員、調整個人題數</li>
          <li>・唯讀：只能看總覽與會員列表</li>
        </ul>
        <ReasonField id="grant-reason" value={reason} onChange={setReason} />
        <p className="text-xs text-muted">對方要先用這個 Email 登入本站一次，並完成 Email 驗證。</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="action-primary px-5" disabled={busy || !email || reason.trim().length < 2}>{busy ? "處理中…" : "指派"}</button>
          {view}
        </div>
      </form>
    </Card>
  );
}
