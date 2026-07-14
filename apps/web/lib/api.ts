const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

// El servidor se suspende por inactividad y la primera llamada puede tardar
// hasta un minuto en despertarlo. Cuando eso pasa, fetch falla con un
// "Failed to fetch" que no le dice nada al usuario.
const CONNECTION_ERROR =
  'No pudimos conectar con el servidor. Si es la primera consulta del día ' +
  'puede tardar hasta un minuto en responder: esperá unos segundos y reintentá.';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // fetch solo rechaza por fallas de red/CORS, nunca por un status HTTP.
    throw new Error(CONNECTION_ERROR);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), }),
};
