import { z } from 'zod';

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  created_at: z.number(),
});
