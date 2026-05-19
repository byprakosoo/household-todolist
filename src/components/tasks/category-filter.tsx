"use client";

import { X } from "lucide-react";
import type { TaskCategory } from "@/types";

interface CategoryFilterProps {
  categories: TaskCategory[];
  activeFilters: string[];
  onToggle: (categoryId: string) => void;
}

export function CategoryFilter({ categories, activeFilters, onToggle }: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap pb-2">
      <span className="text-[10px] text-muted-foreground mr-1 uppercase tracking-wider">Filter:</span>
      {categories.map((cat) => {
        const isActive = activeFilters.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all hover:bg-accent"
            style={{
              borderColor: isActive ? cat.color_hex : undefined,
              backgroundColor: isActive ? cat.color_hex + "15" : undefined,
              color: isActive ? cat.color_hex : undefined,
            }}
          >
            {cat.emoji && <span className="text-xs">{cat.emoji}</span>}
            {cat.name}
            {isActive && <X className="h-3 w-3" />}
          </button>
        );
      })}
      {activeFilters.length > 0 && (
        <button
          onClick={() => activeFilters.forEach((id) => onToggle(id))}
          className="text-[10px] text-muted-foreground hover:text-foreground px-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
