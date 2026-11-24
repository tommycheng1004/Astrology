/** 後台 API 的回應格式（前後端共用，只有型別，不含任何伺服器程式） */

export type AdminRole = "owner" | "admin" | "support" | "viewer";

export type AdminSession = {
  email: string;
  role: AdminRole;
  roleLabel: string;
  permissions: string[];
};

export type DayStat = { date: string; questionsMember: number; questionsGuest: number; newMembers: number };

export type AdminOverview = {
  members: { total: number; new7d: number; active7d: number };
  charts: number;
  reports: number;
  days: DayStat[];
  config: AdminConfig;
};

export type MemberRow = {
  uid: string;
  email: string;
  name: string;
  provider: string;
  verified: boolean;
  firstSeen: string;
  lastSeen: string;
  dailyLimit: number | null;
};

export type MemberDetail = MemberRow & {
  charts: number;
  reports: number;
  usage: { date: string; count: number }[];
  /** 這位會員目前每天實際可問的題數（個人設定或全站設定） */
  effectiveLimit: number;
};

export type AdminConfig = {
  aiEnabled: boolean;
  dailyGuest: number;
  dailyMember: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AuditRow = {
  id: string;
  at: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  actionLabel: string;
  target: string;
  before: string;
  after: string;
  reason: string;
};

export type AdminRow = { uid: string | null; email: string; role: AdminRole; roleLabel: string; grantedBy: string | null; grantedAt: string | null };
