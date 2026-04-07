import { ipc } from '@/ipc/manager';

export function listCategories() {
  return ipc.client.category.listCategories();
}

export function createCategory(input: { name: string; color: string }) {
  return ipc.client.category.createCategory(input);
}

export function updateCategory(input: { id: string; name: string; color: string }) {
  return ipc.client.category.updateCategory(input);
}

export function deleteCategory(input: { id: string }) {
  return ipc.client.category.deleteCategory(input);
}

export function updateAccountCategory(input: { accountId: string; categoryId: string | null }) {
  return ipc.client.category.updateAccountCategory(input);
}
