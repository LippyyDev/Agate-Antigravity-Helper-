import { ipc } from '@/ipc/manager';

export function openLogDirectory() {
  return ipc.client.system.openLogDirectory();
}
