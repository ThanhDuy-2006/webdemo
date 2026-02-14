const API_URL = import.meta.env.VITE_API_URL || "/api";

// Helper to get cookie value (for CSRF)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export const api = {
  get: async (url) => request(url, "GET"),
  post: async (url, body) => request(url, "POST", body),
  put: async (url, body) => request(url, "PUT", body),
  patch: async (url, body) => request(url, "PATCH", body),
  delete: async (url) => request(url, "DELETE"),
};

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onRefreshed() {
    refreshSubscribers.map(cb => cb());
    refreshSubscribers = [];
}

async function request(url, method, body = null, retry = true) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add CSRF Token for non-GET requests
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfToken = getCookie('csrfToken');
      if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
      }
  }

  let finalBody = body;
  if (body instanceof FormData) {
      delete headers["Content-Type"];
  } else if (body) {
      finalBody = JSON.stringify(body);
  }

  try {
      const res = await fetch(API_URL + url, {
        method,
        headers,
        body: finalBody,
        credentials: "include", // CRITICAL for cookies
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle Token Expired
        if (res.status === 401 && data.error === "TOKEN_EXPIRED" && retry) {
            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
                        method: 'POST',
                        credentials: "include"
                    });
                    if (refreshRes.ok) {
                        isRefreshing = false;
                        onRefreshed();
                        return request(url, method, body, false);
                    }
                } catch (e) {
                    isRefreshing = false;
                }
            } else {
                return new Promise(resolve => {
                    subscribeTokenRefresh(() => {
                        resolve(request(url, method, body, false));
                    });
                });
            }
        }
        
        if (res.status === 401) {
            // Real logout/session lost
            window.dispatchEvent(new CustomEvent("unauthorized"));
        }

        if (res.status === 403 && data.error === "SUSPENDED") {
            window.dispatchEvent(new CustomEvent("account-suspended"));
        }
        throw new Error(data.error || "API Error");
      }
      return data;
  } catch (error) {
      throw error;
  }
}

// --- EXPENSES ---
export const expenses = {
    getAll: (params) => api.get('/expenses' + (params ? '?' + new URLSearchParams(params) : '')),
    getCategories: () => api.get('/expenses/categories'),
    getStats: (month) => api.get(`/expenses/stats?month=${month}`),
    getDetail: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post('/expenses', data),
    updateCategory: (id, data) => api.patch(`/expenses/${id}/category`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
    restore: (id) => api.patch(`/expenses/${id}/restore`),
    sync: () => api.post('/expenses/sync'),
    migrate: () => api.post('/expenses/migrate'),
};
