"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBuyingItems } from "@/hooks/use-buying-items";
import type { BuyingItem } from "@/types";
import { cn } from "@/lib/utils";

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export default function BuyingPage() {
  const { items, isLoading, createItem, updateItem, setItemBought, deleteItem, clearBought } = useBuyingItems();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<BuyingItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const activeItems = useMemo(() => items.filter((item) => !item.is_bought), [items]);
  const boughtItems = useMemo(() => items.filter((item) => item.is_bought), [items]);

  const resetForm = () => {
    setName("");
    setQuantity("");
  };

  const handleAdd = async () => {
    if (!name.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await createItem({
        name: name.trim(),
        quantity: quantity.trim() || null,
      });
      resetForm();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to add item"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const openEdit = (item: BuyingItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity || "");
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditQuantity("");
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateItem(editingItem.id, {
        name: editName.trim(),
        quantity: editQuantity.trim() || null,
      });
      closeEdit();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update item"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleBought = async (item: BuyingItem, checked: boolean) => {
    try {
      await setItemBought(item.id, checked);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update item"));
    }
  };

  const handleDelete = async (item: BuyingItem) => {
    try {
      await deleteItem(item.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete item"));
    }
  };

  const handleClearBought = async () => {
    setIsClearing(true);
    try {
      await clearBought();
      setConfirmClearOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to clear bought items"));
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Buying List</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeItems.length} active, {boughtItems.length} bought
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleAddKeyDown}
          placeholder="What do you need to buy?"
          maxLength={120}
          className="h-11 text-base"
        />
        <div className="flex gap-2">
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Qty (optional)"
            maxLength={50}
            className="h-10"
          />
          <Button onClick={handleAdd} disabled={!name.trim() || isAdding} className="h-10 px-4">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">No items yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add something you need to buy.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <BuyingSection
            title="To buy"
            items={activeItems}
            emptyText="Nothing left to buy."
            onToggle={handleToggleBought}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {boughtItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Bought
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearOpen(true)}
                  disabled={isClearing}
                >
                  Clear bought
                </Button>
              </div>
              <div className="space-y-2.5">
                {boughtItems.map((item) => (
                  <BuyingItemRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggleBought}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
              placeholder="Item name"
              maxLength={120}
              autoFocus
              className="h-11 text-base"
            />
            <Input
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
              placeholder="Quantity (optional)"
              maxLength={50}
              className="h-10"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editName.trim() || isSavingEdit}>
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear bought items?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove {boughtItems.length} bought item{boughtItems.length !== 1 ? "s" : ""} from the list.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setConfirmClearOpen(false)} disabled={isClearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearBought} disabled={isClearing}>
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BuyingSectionProps {
  title: string;
  items: BuyingItem[];
  emptyText: string;
  onToggle: (item: BuyingItem, checked: boolean) => Promise<void>;
  onEdit: (item: BuyingItem) => void;
  onDelete: (item: BuyingItem) => Promise<void>;
}

function BuyingSection({ title, items, emptyText, onToggle, onEdit, onDelete }: BuyingSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <BuyingItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface BuyingItemRowProps {
  item: BuyingItem;
  onToggle: (item: BuyingItem, checked: boolean) => Promise<void>;
  onEdit: (item: BuyingItem) => void;
  onDelete: (item: BuyingItem) => Promise<void>;
}

function BuyingItemRow({ item, onToggle, onEdit, onDelete }: BuyingItemRowProps) {
  return (
    <div className={cn("flex items-start gap-3.5 rounded-xl border bg-card p-4 shadow-sm transition-all", item.is_bought && "opacity-60")}>
      <Checkbox
        checked={item.is_bought}
        onCheckedChange={(checked) => onToggle(item, Boolean(checked))}
        aria-label={item.is_bought ? `Mark ${item.name} as not bought` : `Mark ${item.name} as bought`}
        className="mt-0.5 cursor-pointer"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium leading-snug", item.is_bought && "line-through text-muted-foreground")}>
          {item.name}
        </p>
        {item.quantity && (
          <p className="text-xs text-muted-foreground mt-1">{item.quantity}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit {item.name}</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item)}>
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">Delete {item.name}</span>
        </Button>
      </div>
    </div>
  );
}
