"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssigneePicker } from "./assignee-picker";
import { CategoryPicker } from "./category-picker";
import type { AssigneeType } from "@/types";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CreateTaskInputProps {
  onCreate: (task: {
    title: string;
    assignee_type: AssigneeType;
    category_id: string | null;
  }) => Promise<void>;
}

export function CreateTaskInput({ onCreate }: CreateTaskInputProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("both");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setAssigneeType("both");
    setCategoryId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ title: title.trim(), assignee_type: assigneeType, category_id: categoryId });
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    setOpen(isOpen);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="text-base font-medium h-11 rounded-lg"
              autoFocus
            />

            <AssigneePicker value={assigneeType} onChange={setAssigneeType} />

            <CategoryPicker value={categoryId} onChange={setCategoryId} />

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || submitting} className="rounded-lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
