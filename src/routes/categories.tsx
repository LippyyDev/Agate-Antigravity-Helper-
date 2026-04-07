import { createFileRoute } from '@tanstack/react-router';
import { CategoryManager } from '@/components/CategoryManager';

function CategoriesPage() {
  return (
    <div className="w-full p-6">
      <CategoryManager />
    </div>
  );
}

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
});
