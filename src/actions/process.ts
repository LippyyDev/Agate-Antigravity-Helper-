import { ipc } from '@/ipc/manager';

export function isProcessRunning() {
  return ipc.client.proc.isProcessRunning();
}

export function closeAntigravity() {
  return ipc.client.proc.closeAntigravity();
}

export function startAntigravity() {
  return ipc.client.proc.startAntigravity();
}
