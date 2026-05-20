"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { CATEGORY_COLORS } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Plus, X, Folder } from "lucide-react";
import { MAX_CATEGORIES } from "@/lib/constants";
import toast from "react-hot-toast";

interface CategoryPickerProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { categories, createCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0]);
  const [adding, setAdding] = useState(false);

  const selected = categories.find((c) => c.id === value);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (categories.length >= MAX_CATEGORIES) {
      toast.error(`Max ${MAX_CATEGORIES} categories per household`);
      return;
    }
    try {
      await createCategory({
        name: newName.trim(),
        color_hex: newColor,
        emoji: newEmoji || null,
      });
      setNewName("");
      setNewEmoji("");
      setAdding(false);
      toast.success("Category created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      toast.error(message);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-2 px-3 font-normal"
          >
            {selected ? (
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selected.color_hex }}
                />
                {selected.emoji && <span className="text-sm">{selected.emoji}</span>}
                <span className="text-sm">{selected.name}</span>
                <X
                  className="h-3.5 w-3.5 ml-auto text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Folder className="h-4 w-4" />
                No category
              </div>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
              !value && "bg-accent"
            )}
          >
            <span className="w-3 h-3 rounded-full border" />
            No category
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onChange(cat.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                value === cat.id && "bg-accent"
              )}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color_hex }}
              />
              {cat.emoji && <span className="text-sm">{cat.emoji}</span>}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
        <Separator />
        {adding ? (
          <div className="p-2 space-y-2">
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              maxLength={30}
            />
            <div className="flex gap-1 flex-wrap">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? "hsl(var(--foreground))" : "transparent",
                    transform: newColor === color ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <Input
              placeholder="Emoji (optional)"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="h-8 text-sm"
              maxLength={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="flex-1 h-8" onClick={handleCreate}>
                Add
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
            New category
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
