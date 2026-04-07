import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { type Category } from '@/types/category';
import { useToast } from '@/components/ui/use-toast';

interface CategoryFormState {
  name: string;
  color: string;
}

const DEFAULT_COLOR = '#6366f1';

export function CategoryManager() {
  const { data: categories = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CategoryFormState>({ name: '', color: DEFAULT_COLOR });

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>({ name: '', color: DEFAULT_COLOR });

  // Delete confirm dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      return;
    }
    createMutation.mutate(
      { name: createForm.name.trim(), color: createForm.color },
      {
        onSuccess: () => {
          toast({ title: 'Category created successfully' });
          setIsCreateOpen(false);
          setCreateForm({ name: '', color: DEFAULT_COLOR });
        },
        onError: () => {
          toast({ title: 'Failed to create category', variant: 'destructive' });
        },
      },
    );
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({ name: category.name, color: category.color });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = (id: string) => {
    if (!editForm.name.trim()) {
      return;
    }
    updateMutation.mutate(
      { id, name: editForm.name.trim(), color: editForm.color },
      {
        onSuccess: () => {
          toast({ title: 'Category updated successfully' });
          setEditingId(null);
        },
        onError: () => {
          toast({ title: 'Failed to update category', variant: 'destructive' });
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: 'Category deleted successfully' });
          setDeletingId(null);
        },
        onError: () => {
          toast({ title: 'Failed to delete category', variant: 'destructive' });
          setDeletingId(null);
        },
      },
    );
  };

  const categoryToDelete = categories.find((c) => c.id === deletingId);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="bg-card rounded-lg border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
            <p className="text-muted-foreground mt-1">
              Manage categories to organize your cloud accounts.
            </p>
          </div>
          <Button
            id="create-category-btn"
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {/* Category List */}
      <div className="bg-card rounded-lg border">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}

        {!isLoading && categories.length === 0 && (
          <div className="text-muted-foreground py-14 text-center">
            <Tag className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <div className="text-sm font-medium">No categories yet</div>
            <div className="mt-1 text-xs">Create one to start organizing your accounts.</div>
          </div>
        )}

        {!isLoading && categories.length > 0 && (
          <ul className="divide-y">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 px-5 py-3">
                {editingId === category.id ? (
                  /* Edit Row */
                  <div className="flex flex-1 items-center gap-3">
                    {/* Color picker */}
                    <label
                      htmlFor={`color-edit-${category.id}`}
                      className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/20 shadow"
                      style={{ backgroundColor: editForm.color }}
                      title="Pick color"
                    >
                      <input
                        id={`color-edit-${category.id}`}
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                    <Input
                      id={`name-edit-${category.id}`}
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdate(category.id);
                        }
                        if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-emerald-500 hover:text-emerald-600"
                        onClick={() => handleUpdate(category.id)}
                        disabled={updateMutation.isPending}
                        title="Save"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={cancelEdit}
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display Row */
                  <>
                    <div
                      className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/10"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => startEdit(category)}
                        title="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive/70 hover:text-destructive h-8 w-8 cursor-pointer"
                        onClick={() => setDeletingId(category.id)}
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Give your category a name and pick a color to identify it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-4">
            {/* Color picker */}
            <label
              htmlFor="color-create"
              className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/20 shadow-md"
              style={{ backgroundColor: createForm.color }}
              title="Pick color"
            >
              <input
                id="color-create"
                type="color"
                value={createForm.color}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, color: e.target.value }))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <Input
              id="category-name-input"
              placeholder="Category name"
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
              className="flex-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateForm({ name: '', color: DEFAULT_COLOR });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !createForm.name.trim()}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {categoryToDelete?.name ?? 'this category'}
              </span>
              ? Accounts using this category will be unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
