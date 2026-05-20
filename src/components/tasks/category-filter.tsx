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
    <div className="flex items-center gap-2 flex-wrap px-0.5">
      {categories.map((cat) => {
        const isActive = activeFilters.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-accent"
            style={{
              borderColor: isActive ? cat.color_hex : undefined,
              backgroundColor: isActive ? cat.color_hex + "15" : undefined,
              color: isActive ? cat.color_hex : undefined,
            }}
          >
            {cat.emoji && <span className="text-sm leading-none">{cat.emoji}</span>}
            <span className="leading-none">{cat.name}</span>
            {isActive && <X className="h-3 w-3" />}
          </button>
        );
      })}
      {activeFilters.length > 0 && (
        <button
          onClick={() => activeFilters.forEach((id) => onToggle(id))}
          className="text-xs text-muted-foreground hover:text-foreground px-1 font-medium transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
