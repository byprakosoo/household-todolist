"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssigneePicker } from "./assignee-picker";
import { CategoryPicker } from "./category-picker";
import type { AssigneeType } from "@/types";
import { Plus } from "lucide-react";

interface CreateTaskInputProps {
  onCreate: (task: {
    title: string;
    assignee_type: AssigneeType;
    category_id: string | null;
  }) => void;
}

export function CreateTaskInput({ onCreate }: CreateTaskInputProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("both");
  const [categoryId, setCategoryId] = useState<string | null>(null);
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

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), assignee_type: assigneeType, category_id: categoryId });
    resetForm();
    setOpen(false);
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
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="text-base font-medium"
              autoFocus
            />

            <AssigneePicker value={assigneeType} onChange={setAssigneeType} />

            <CategoryPicker value={categoryId} onChange={setCategoryId} />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim()}>
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
