// hooks/useFeedback.ts
import { showToast } from '../store/app.store';

export const useFeedback = () => ({
  showSuccess: (msg: string) => showToast(msg, 'success'),
  showError: (msg: string) => showToast(msg, 'error'),
  showInfo: (msg: string) => showToast(msg, 'info'),
  showWarning: (msg: string) => showToast(msg, 'warning'),
});
