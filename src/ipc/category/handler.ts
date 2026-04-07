import { v4 as uuidv4 } from 'uuid';
import { CloudAccountRepo } from '../database/cloudHandler';
import { type Category } from '../../types/category';

export function listCategories(): Category[] {
  return CloudAccountRepo.getCategories();
}

export function createCategory(name: string, color: string): Category {
  const id = uuidv4();
  return CloudAccountRepo.createCategory(id, name, color);
}

export function updateCategory(id: string, name: string, color: string): void {
  CloudAccountRepo.updateCategory(id, name, color);
}

export function deleteCategory(id: string): void {
  CloudAccountRepo.deleteCategory(id);
}

export async function updateAccountCategory(
  accountId: string,
  categoryId: string | null,
): Promise<void> {
  await CloudAccountRepo.updateAccountCategory(accountId, categoryId);
}
