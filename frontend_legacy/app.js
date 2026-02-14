const API = "http://127.0.0.1:3000/api";

export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

export async function api(path, { method="GET", body=null, auth=false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function money(n){
  return Number(n||0).toLocaleString("vi-VN") + " đ";
}
