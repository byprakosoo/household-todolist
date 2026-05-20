"use client";

import { useState } from "react";
import { GripVertical, MessageSquare, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { AssigneePicker } from "./assignee-picker";
import { CategoryPicker } from "./category-picker";
import toast from "react-hot-toast";

interface TaskCardProps {
  task: Task;
  onToggle: (id: string, is_done: boolean) => Promise<void> | void;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  partnerName: string;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function TaskCard({
  task,
  onToggle,
  onUpdate,
  onDelete,
  partnerName,
  isDragging,
  dragHandleProps,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNotes, setEditNotes] = useState(task.notes || "");
  const [editAssignee, setEditAssignee] = useState(task.assignee_type);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(task.category_id || null);

  const assigneeLabel = () => {
    switch (task.assignee_type) {
      case "me":
        return { text: "Me", color: "bg-primary/10 text-primary ring-1 ring-primary/20" };
      case "partner":
        return { text: partnerName || "Partner", color: "bg-secondary text-secondary-foreground ring-1 ring-border" };
      case "both":
        return { text: "Us", color: "bg-accent text-accent-foreground ring-1 ring-accent-foreground/10" };
    }
  };

  const al = assigneeLabel();

  const handleToggle = async (checked: boolean) => {
    try {
      await onToggle(task.id, checked);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(task.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle.trim(),
      notes: editNotes || null,
      assignee_type: editAssignee,
      category_id: editCategoryId,
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(task.title);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3.5 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
          task.is_done && "opacity-50",
          isDragging && "z-50 shadow-xl scale-[1.02] bg-accent/20"
        )}
      >
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <input
          type="checkbox"
          checked={task.is_done}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-2 border-muted-foreground/30 accent-primary checked:accent-primary transition-colors"
        />

        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "block text-[15px] font-medium cursor-pointer hover:text-primary transition-colors leading-snug",
              task.is_done && "line-through text-muted-foreground/70"
            )}
            onClick={() => {
              setEditTitle(task.title);
              setEditNotes(task.notes || "");
              setEditAssignee(task.assignee_type);
              setEditCategoryId(task.category_id || null);
              setIsEditing(true);
            }}
          >
            {task.title}
          </span>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-[11px] px-2 py-0.5 h-5.5 gap-1 font-normal rounded-md shadow-none", al.color)}>
              {task.assignee_type === "both" ? (
                <Users className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {al.text}
            </Badge>

            {task.category && (
              <Badge
                variant="outline"
                className="text-[11px] px-2 py-0.5 h-5.5 gap-1 font-normal rounded-md shadow-none"
                style={{
                  borderColor: task.category.deleted_at ? "#9CA3AF" : task.category.color_hex,
                  color: task.category.deleted_at ? "#9CA3AF" : task.category.color_hex,
                }}
              >
                {task.category.emoji && <span>{task.category.emoji}</span>}
                <span>{task.category.name}</span>
              </Badge>
            )}

            {task.notes && (
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) setIsEditing(false); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              autoFocus
              className="text-base font-medium h-11 rounded-lg"
            />

            <AssigneePicker value={editAssignee} onChange={setEditAssignee} />

            <CategoryPicker value={editCategoryId} onChange={setEditCategoryId} />

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Notes (optional)</span>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[80px] text-sm rounded-lg"
                maxLength={500}
              />
              <div className="text-[10px] text-muted-foreground text-right">
                {editNotes.length}/500
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="rounded-lg">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
