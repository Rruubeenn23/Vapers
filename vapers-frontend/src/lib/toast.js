const listeners = new Set();

export function toast(message, type = 'info') {
  const id = Date.now() + Math.random();
  listeners.forEach(fn => fn({ id, message, type }));
}

export const toastSuccess = (msg) => toast(msg, 'success');
export const toastError = (msg) => toast(msg, 'error');
export const toastInfo = (msg) => toast(msg, 'info');

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
