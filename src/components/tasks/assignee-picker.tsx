"use client";

import { cn } from "@/lib/utils";
import type { AssigneeType } from "@/types";
import { Check } from "lucide-react";

const OPTIONS: { value: AssigneeType; label: string; sub: string }[] = [
  { value: "me", label: "Me", sub: "I'll do this" },
  { value: "partner", label: "Partner", sub: "Assign to partner" },
  { value: "both", label: "Us", sub: "We'll do this together" },
];

interface AssigneePickerProps {
  value: AssigneeType;
  onChange: (value: AssigneeType) => void;
}

export function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-lg border px-4 py-3 text-left transition-all",
            value === opt.value
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border hover:bg-accent hover:border-accent-foreground/20",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{opt.label}</span>
            {value === opt.value && <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">{opt.sub}</span>
        </button>
      ))}
    </div>
  );
}
