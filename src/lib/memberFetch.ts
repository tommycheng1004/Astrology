import { currentIdToken } from "@/lib/account";

export async function memberFetch(url: string, init?: RequestInit) {
  const send = async (refresh: boolean) => {
    const headers = new Headers(init?.headers);
    const token = await currentIdToken(refresh);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers, cache: "no-store" });
  };
  const result = await send(false);
  return result.status === 401 ? send(true) : result;
}
