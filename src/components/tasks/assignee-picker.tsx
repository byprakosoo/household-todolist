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
            "flex-1 rounded-lg border px-3 py-2.5 text-left transition-all",
            value === opt.value
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:bg-accent",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{opt.label}</span>
            {value === opt.value && <Check className="h-4 w-4 text-primary" />}
          </div>
          <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
        </button>
      ))}
    </div>
  );
}
