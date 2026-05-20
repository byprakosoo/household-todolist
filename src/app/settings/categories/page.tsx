"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { CATEGORY_COLORS } from "@/types";
import { MAX_CATEGORIES } from "@/lib/constants";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setColor(CATEGORY_COLORS[0]);
    setEmoji("");
    setEditing(null);
  };

  const handleOpenCreate = () => {
    if (categories.length >= MAX_CATEGORIES) {
      toast.error(`Max ${MAX_CATEGORIES} categories per household`);
      return;
    }
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (cat: { id: string; name: string; color_hex: string; emoji: string | null }) => {
    setName(cat.name);
    setColor(cat.color_hex);
    setEmoji(cat.emoji || "");
    setEditing(cat.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing, { name: name.trim(), color_hex: color, emoji: emoji || null });
        toast.success("Category updated");
      } else {
        await createCategory({ name: name.trim(), color_hex: color, emoji: emoji || null });
        toast.success("Category created");
      }
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save category";
      toast.error(message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {categories.length}/{MAX_CATEGORIES} used
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} disabled={categories.length >= MAX_CATEGORIES} className="rounded-lg">
          <Plus className="h-4 w-4 mr-1.5" /> New
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <span
              className="w-6 h-6 rounded-full shrink-0 border-2 border-white shadow-sm"
              style={{ backgroundColor: cat.color_hex }}
            />
            {cat.emoji && <span className="text-lg shrink-0">{cat.emoji}</span>}
            <span className="flex-1 text-sm font-medium">{cat.name}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(cat)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🏷️</div>
            <p className="text-muted-foreground font-medium">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Create categories to organize your tasks (e.g. Groceries, Admin).
            </p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                maxLength={30}
                autoFocus
              />
              <div className="text-[10px] text-muted-foreground text-right">
                {name.length}/30
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Emoji (optional)</label>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="e.g. 🛒"
                maxLength={2}
                className="text-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
