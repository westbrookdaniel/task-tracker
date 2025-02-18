import { ArrowUp, ChevronRight, Minus, Plus } from "lucide-react";
import { useState as useReactState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message ?? "Error"}`);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: string;
  title: string;
  value?: number;
  upgrade?: boolean;
  group?: string;
}

interface State {
  tasks: Task[];
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (title: string, newTask: Partial<Omit<Task, "id">>) => void;
  deleteTask: (title: string) => void;
}

const useStore = create<State>()(
  persist(
    (set) => ({
      tasks: [],
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
      deleteTask: (id: string) =>
        set((state) => {
          const taskToDeleteIndex = state.tasks.findIndex(
            (task) => task.id === id,
          );
          assert(taskToDeleteIndex !== -1);

          const newTasks = state.tasks.filter((task) => task.id !== id);
          assert(newTasks.length === state.tasks.length - 1);

          return { tasks: newTasks };
        }),
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

  return (
    <li className="flex items-center gap-2">
      <Input
        value={task.title}
        onChange={(e) => updateTask(task.id, { title: e.target.value })}
        className="flex-1"
      />
      <Input value={task.value} className="max-w-25" />
      <Button
        onClick={() => updateTask(task.id, { upgrade: !task.upgrade })}
        aria-label="upgrade"
      >
        {task.upgrade ? <ArrowUp className="size-5" /> : null}
      </Button>
      <Button onClick={() => deleteTask(task.id)} aria-label="delete">
        <Minus className="size-5" />
      </Button>
    </li>
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
