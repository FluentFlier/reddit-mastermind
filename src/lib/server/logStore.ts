export type LogEntry = {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
};

type Listener = (entry: LogEntry) => void;

const store: LogEntry[] = [];
const listeners = new Set<Listener>();

function nextId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addLog(level: LogEntry['level'], message: string, meta?: LogEntry['meta']) {
  const entry: LogEntry = {
    id: nextId(),
    ts: new Date().toISOString(),
    level,
    message,
    meta,
  };
  store.push(entry);
  if (store.length > 200) {
    store.shift();
  }
  listeners.forEach((listener) => listener(entry));
}

export function getLogs() {
  return [...store];
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
