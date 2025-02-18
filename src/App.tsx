import { ArrowUp, ChevronRight, Minus, Plus } from "lucide-react";
import { useState as useReactState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as ContextMenu from "@radix-ui/react-context-menu";

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message ?? "Error"}`);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: string;
  title: string;
  value?: string;
  upgrade?: boolean;
}

interface Group {
  id: string;
  name: string;
  taskIds: string[];
}

interface State {
  tasks: Task[];
  groups: Group[];
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, newTask: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addGroup: (name: string) => void;
  updateGroup: (id: string, newGroup: Partial<Omit<Group, "id">>) => void;
  deleteGroup: (id: string) => void;
  addTaskToGroup: (taskId: string, groupId: string) => void;
  removeTaskFromGroup: (taskId: string, groupId: string) => void;
}

const useStore = create<State>()(
  persist(
    (set, get) => ({
      tasks: [],
      groups: [],
      addTask: (task: Omit<Task, "id">) => {
        if (!task.title.trim()) return;
        set((state) => {
          const newTasks = [
            ...state.tasks,
            { ...task, id: crypto.randomUUID() },
          ];

          return { tasks: newTasks };
        });
      },
      updateTask: (id: string, newTask: Partial<Omit<Task, "id">>) => {
        set((state) => {
          const taskToUpdateIndex = state.tasks.findIndex(
            (task) => task.id === id,
          );
          assert(taskToUpdateIndex !== -1);

          const newTasks = [...state.tasks];
          newTasks[taskToUpdateIndex] = {
            ...newTasks[taskToUpdateIndex],
            ...newTask,
          };

          return { tasks: newTasks };
        });
      },
      deleteTask: (id: string) => {
        set((state) => {
          const taskToDeleteIndex = state.tasks.findIndex(
            (task) => task.id === id,
          );
          assert(taskToDeleteIndex !== -1);

          const newTasks = state.tasks.filter((task) => task.id !== id);
          assert(newTasks.length === state.tasks.length - 1);

          // Also remove the task from any groups it belongs to
          const newGroups = state.groups.map((group) => ({
            ...group,
            taskIds: group.taskIds.filter((taskId) => taskId !== id),
          }));

          // Delete empty groups
          const groupsToDelete = newGroups.filter(
            (group) => group.taskIds.length === 0,
          );

          groupsToDelete.forEach((group) => {
            set((state) => ({
              groups: state.groups.filter((g) => g.id !== group.id),
            }));
          });

          return { tasks: newTasks, groups: newGroups };
        });
      },
      addGroup: (name: string) => {
        set((state) => {
          const newGroup: Group = {
            id: crypto.randomUUID(),
            name: name,
            taskIds: [],
          };
          const newGroups = [...state.groups, newGroup];
          return { groups: newGroups };
        });
      },
      updateGroup: (id: string, newGroup: Partial<Omit<Group, "id">>) => {
        set((state) => {
          const groupToUpdateIndex = state.groups.findIndex(
            (group) => group.id === id,
          );
          assert(groupToUpdateIndex !== -1);

          const newGroups = [...state.groups];
          newGroups[groupToUpdateIndex] = {
            ...newGroups[groupToUpdateIndex],
            ...newGroup,
          };

          return { groups: newGroups };
        });
      },
      deleteGroup: (id: string) => {
        set((state) => {
          const groupToDeleteIndex = state.groups.findIndex(
            (group) => group.id === id,
          );
          assert(groupToDeleteIndex !== -1);

          const newGroups = state.groups.filter((group) => group.id !== id);
          assert(newGroups.length === state.groups.length - 1);

          return { groups: newGroups };
        });
      },
      addTaskToGroup: (taskId: string, groupId: string) => {
        set((state) => {
          const groupToUpdateIndex = state.groups.findIndex(
            (group) => group.id === groupId,
          );
          assert(groupToUpdateIndex !== -1);

          const newGroups = [...state.groups];
          if (!newGroups[groupToUpdateIndex].taskIds.includes(taskId)) {
            newGroups[groupToUpdateIndex].taskIds = [
              ...newGroups[groupToUpdateIndex].taskIds,
              taskId,
            ];
          }

          return { groups: newGroups };
        });
      },
      removeTaskFromGroup: (taskId: string, groupId: string) => {
        set((state) => {
          const groupToUpdateIndex = state.groups.findIndex(
            (group) => group.id === groupId,
          );
          assert(groupToUpdateIndex !== -1);

          const newGroups = [...state.groups];
          newGroups[groupToUpdateIndex].taskIds = newGroups[
            groupToUpdateIndex
          ].taskIds.filter((id) => id !== taskId);

          return { groups: newGroups };
        });
      },
    }),
    { name: "dan-tasks-storage" },
  ),
);

function TaskList() {
  const tasks = useStore((state) => state.tasks);

  if (tasks.length === 0) return null;

  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

function TaskItem({ task }: { task: Task }) {
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const groups = useStore((state) => state.groups);
  const addTaskToGroup = useStore((state) => state.addTaskToGroup);
  const addGroup = useStore((state) => state.addGroup);
  const [newGroupName, setNewGroupName] = useReactState("");

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <li className="flex items-center gap-2">
          <Input
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            className="flex-1"
          />
          <Input value={task.value} className="max-w-18" />
          <Button
            onClick={() => updateTask(task.id, { upgrade: !task.upgrade })}
            aria-label="upgrade"
          >
            {task.upgrade ? <ArrowUp className="size-5" /> : null}
          </Button>
          <Button onClick={() => deleteTask(task.id)} aria-label="delete">
            <Minus className="size-5" />
          </Button>
          <ContextMenu.Portal>
            <ContextMenu.Content
              className={cn(
                "flex flex-col gap-1",
                "z-50 bg-neutral-300 p-2",
                "focus:outline-none",
              )}
            >
              {groups.map((group) => (
                <ContextMenu.Item
                  key={group.id}
                  onSelect={() => addTaskToGroup(task.id, group.id)}
                  asChild
                >
                  <Button className="justify-start px-3 text-neutral-700 w-full">{group.name}</Button>
                </ContextMenu.Item>
              ))}
              <ContextMenu.Separator />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addGroup(newGroupName);
                  setNewGroupName("");
                }}
                className="flex items-center gap-2"
              >
                <Input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="border-0 flex-1 bg-neutral-300 focus-visible:bg-neutral-300"
                />
                <Button type="submit">
                  <Plus className="size-5" />
                </Button>
              </form>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </li>
      </ContextMenu.Trigger>
    </ContextMenu.Root>
  );
}

function TaskForm() {
  const addTask = useStore((state) => state.addTask);
  const [title, setTitle] = useReactState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({ title });
    setTitle("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-neutral-600 relative"
    >
      <ChevronRight className="size-5 text-neutral-600 absolute -left-6" />
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border-0 flex-1"
      />
      <Button type="submit">
        <Plus className="size-5" />
      </Button>
    </form>
  );
}

export function App() {
  return (
    <div className="max-w-2xl mx-auto p-16 flex flex-col gap-16">
      <TaskList />
      <TaskForm />
    </div>
  );
}

function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "size-10 flex items-center justify-center",
        "text-neutral-600 focus:outline-none",
        "hover:bg-neutral-500/30 focus-visible:bg-neutral-500/30",
        className,
      )}
      {...props}
    />
  );
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-0 bg-neutral-400 focus:ring-0",
        "hover:bg-neutral-500/30 focus-visible:bg-neutral-500/30",
        className,
      )}
      {...props}
    />
  );
}
