import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateAccountCategory,
} from '@/actions/category';
import { type Category } from '@/types/category';
import { QUERY_KEYS as CLOUD_QUERY_KEYS } from './useCloudAccounts';

export const CATEGORY_QUERY_KEYS = {
  categories: ['categories'],
};

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: CATEGORY_QUERY_KEYS.categories,
    queryFn: listCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.categories });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.categories });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.categories });
      // Also refresh accounts since their category references may be cleared
      queryClient.invalidateQueries({ queryKey: CLOUD_QUERY_KEYS.cloudAccounts });
    },
  });
}

export function useUpdateAccountCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccountCategory,
    onSuccess: (_, variables) => {
      // Optimistically update accounts cache
      queryClient.setQueryData(
        CLOUD_QUERY_KEYS.cloudAccounts,
        (oldData: any[] | undefined) => {
          if (!oldData) {
            return oldData;
          }
          return oldData.map((acc) =>
            acc.id === variables.accountId
              ? { ...acc, category_id: variables.categoryId }
              : acc,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: CLOUD_QUERY_KEYS.cloudAccounts });
    },
  });
}
