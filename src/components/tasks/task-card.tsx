"use client";

import { useState } from "react";
import { GripVertical, MessageSquare, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
        return { text: "Me", color: "bg-primary/10 text-primary" };
      case "partner":
        return { text: partnerName || "Partner", color: "bg-secondary text-secondary-foreground" };
      case "both":
        return { text: "Us", color: "bg-accent text-accent-foreground" };
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
          "group flex items-start gap-3 rounded-lg border bg-card p-4 transition-all",
          task.is_done && "opacity-60",
          isDragging && "z-50 shadow-lg scale-[1.02] bg-accent/20"
        )}
      >
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <Checkbox
          checked={task.is_done}
          onCheckedChange={handleToggle}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium cursor-pointer hover:text-primary transition-colors",
                task.is_done && "line-through text-muted-foreground"
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
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", al.color)}>
              {task.assignee_type === "both" ? (
                <Users className="h-3 w-3 mr-1" />
              ) : (
                <User className="h-3 w-3 mr-1" />
              )}
              {al.text}
            </Badge>

            {task.category && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5"
                style={{
                  borderColor: task.category.deleted_at ? "#9CA3AF" : task.category.color_hex,
                  color: task.category.deleted_at ? "#9CA3AF" : task.category.color_hex,
                }}
              >
                {task.category.emoji && <span className="mr-1">{task.category.emoji}</span>}
                {task.category.name}
              </Badge>
            )}

            {task.notes && (
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) setIsEditing(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              autoFocus
              className="text-base font-medium"
            />

            <AssigneePicker value={editAssignee} onChange={setEditAssignee} />

            <CategoryPicker value={editCategoryId} onChange={setEditCategoryId} />

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Notes (optional)</span>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[80px] text-sm"
                maxLength={500}
              />
              <div className="text-[10px] text-muted-foreground text-right">
                {editNotes.length}/500
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
