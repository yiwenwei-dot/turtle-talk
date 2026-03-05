'use client';

import type { WishListItem } from './useWishList';

export function useWishListMutations(childId: string | null | undefined, refetch: () => void) {
  const addItem = async (label: string, sortOrder?: number): Promise<WishListItem | null> => {
    if (!childId) return null;
    const res = await fetch('/api/wish-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ childId, label, sortOrder }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add');
    refetch();
    return data.item ?? null;
  };

  const updateItem = async (
    id: string,
    updates: { label?: string; sortOrder?: number }
  ): Promise<WishListItem | null> => {
    if (!childId) return null;
    const res = await fetch('/api/wish-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, childId, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update');
    refetch();
    return data.item ?? null;
  };

  const deleteItem = async (id: string): Promise<void> => {
    if (!childId) return;
    const res = await fetch('/api/wish-list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, childId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
    refetch();
  };

  return { addItem, updateItem, deleteItem };
}
