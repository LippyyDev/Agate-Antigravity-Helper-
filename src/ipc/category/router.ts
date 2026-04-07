import { z } from 'zod';
import { os } from '@orpc/server';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateAccountCategory,
} from './handler';
import { CategorySchema } from '../../types/category';

export const categoryRouter = os.router({
  listCategories: os.output(z.array(CategorySchema)).handler(async () => {
    return listCategories();
  }),

  createCategory: os
    .input(z.object({ name: z.string().min(1), color: z.string() }))
    .output(CategorySchema)
    .handler(async ({ input }) => {
      return createCategory(input.name, input.color);
    }),

  updateCategory: os
    .input(z.object({ id: z.string(), name: z.string().min(1), color: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      updateCategory(input.id, input.name, input.color);
    }),

  deleteCategory: os
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      deleteCategory(input.id);
    }),

  updateAccountCategory: os
    .input(z.object({ accountId: z.string(), categoryId: z.string().nullable() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await updateAccountCategory(input.accountId, input.categoryId);
    }),
});

