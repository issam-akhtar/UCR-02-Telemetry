// api.js
// Axios baseURL is derived from configs/config.yaml (with env + sane fallbacks)
import axios from 'axios';

const DEFAULTS = {
  host: (typeof window !== 'undefined' && window.location.hostname) || 'localhost',
  apiPort: 9092,
};

const ENV = (() => {
  const vite = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return {
    host: vite.VITE_HOST || null,
    apiPort: vite.VITE_API_PORT ? Number(vite.VITE_API_PORT) : null,
  };
})();

async function fetchText(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch {
    return null;
  }
}

async function parseYamlToJson(yamlText) {
  if (!yamlText) return null;
  try {
    const { default: yaml } = await import('js-yaml');
    return yaml.load(yamlText);
  } catch {
    return null;
  }
}

async function loadRuntimeConfig() {
  const yamlText =
    (await fetchText('/configs/config.yaml')) ||
    (await fetchText('/config.yaml'));

  const cfg = await parseYamlToJson(yamlText);

  const hostFromYaml = cfg?.network?.host_ip || cfg?.websocket?.ip || 'localhost';
  const apiPortFromYaml =
    Number(cfg?.network?.ports?.rest_api) ||
    Number(cfg?.apiport) ||
    DEFAULTS.apiPort;

  const localish = new Set(['localhost', '0.0.0.0', '::', '127.0.0.1']);
  const resolvedHost = localish.has(String(hostFromYaml).toLowerCase())
    ? DEFAULTS.host
    : hostFromYaml;

  const host = ENV.host || resolvedHost || DEFAULTS.host;
  const apiPort = ENV.apiPort ?? apiPortFromYaml ?? DEFAULTS.apiPort;

  return { host, apiPort };
}

// Create axios instance with an initial (safe) baseURL
export const axiosInstance = axios.create({
  baseURL: `http://${DEFAULTS.host}:${DEFAULTS.apiPort}/api`,
  timeout: 5000,
});

// Patch baseURL once YAML is loaded (no need to recreate the instance)
(async () => {
  try {
    const { host, apiPort } = await loadRuntimeConfig();
    axiosInstance.defaults.baseURL = `http://${host}:${apiPort}/api`;
  } catch {
    // keep defaults
  }
})();

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('API request failed:', error?.message || error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
