// hooks/useFeedback.ts
// Note: imports from store/app.store which will be created in Chunk 2
export const useFeedback = () => ({
  showSuccess: (msg: string) => { window.dispatchEvent(new CustomEvent('flb_toast_event', { detail: { message: msg, type: 'success' } })); },
  showError: (msg: string) => { window.dispatchEvent(new CustomEvent('flb_toast_event', { detail: { message: msg, type: 'error' } })); },
  showInfo: (msg: string) => { window.dispatchEvent(new CustomEvent('flb_toast_event', { detail: { message: msg, type: 'info' } })); },
  showWarning: (msg: string) => { window.dispatchEvent(new CustomEvent('flb_toast_event', { detail: { message: msg, type: 'warning' } })); },
});
