import { ArrowUp, ChevronRight, Minus, Plus } from "lucide-react";
import { useState as useReactState, useEffect, useState } from "react";
import { create } from "zustand";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as ContextMenu from "@radix-ui/react-context-menu";

// this isnt secure but its just to stop lazy bots
const API_KEY = "12345";

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
  groupId?: string;
}

interface Group {
  id: string;
  name: string;
}

interface State {
  tasks: Task[];
  groups: Group[];
  addTask: (task: Omit<Task, "id">, groupId?: string) => void;
  updateTask: (id: string, newTask: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addGroup: (name: string) => void;
  updateGroup: (id: string, newGroup: Partial<Omit<Group, "id">>) => void;
  deleteGroup: (id: string) => void;
  setTaskGroup: (taskId: string, groupId: string | undefined) => void;
  initialize: (data: State) => void;
}

const useStore = create<State>()((set, get) => ({
  tasks: [],
  groups: [],
  addTask: (task: Omit<Task, "id">, groupId?: string) => {
    if (!task.title.trim()) return;

    set((state) => {
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        groupId: groupId,
      };
      const newTasks = [...state.tasks, newTask];
      return { tasks: newTasks };
    });
  },
  updateTask: (id: string, newTask: Partial<Omit<Task, "id">>) => {
    set((state) => {
      const taskToUpdateIndex = state.tasks.findIndex((task) => task.id === id);
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
      const taskToDeleteIndex = state.tasks.findIndex((task) => task.id === id);
      assert(taskToDeleteIndex !== -1);

      const newTasks = state.tasks.filter((task) => task.id !== id);
      assert(newTasks.length === state.tasks.length - 1);

      return { tasks: newTasks };
    });
  },
  addGroup: (name: string) => {
    set((state) => {
      const newGroup: Group = {
        id: crypto.randomUUID(),
        name: name,
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

      const tasksToUngroup = state.tasks.filter((task) => task.groupId === id);

      tasksToUngroup.forEach((task) => {
        get().setTaskGroup(task.id, undefined);
      });

      return { groups: newGroups };
    });
  },
  setTaskGroup: (taskId: string, groupId: string | undefined) => {
    set((state) => {
      const taskToUpdateIndex = state.tasks.findIndex(
        (task) => task.id === taskId,
      );
      assert(taskToUpdateIndex !== -1);

      const newTasks = [...state.tasks];
      newTasks[taskToUpdateIndex] = {
        ...newTasks[taskToUpdateIndex],
        groupId: groupId,
      };

      return { tasks: newTasks };
    });
  },
  initialize: (data: State) => {
    set(() => data);
  },
}));

function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

async function getGroup(id: string): Promise<State | null> {
  try {
    const response = await fetch(`/api/groups?id=${id}&apikey=${API_KEY}`);
    const data = await response.json();
    if (!data.data) return null;
    return JSON.parse(data.data);
  } catch (error) {
    console.error("Error fetching group:", error);
    return null;
  }
}

async function putGroup(id: string, body: State): Promise<void> {
  try {
    const response = await fetch("/api/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: API_KEY,
        id: id,
        data: JSON.stringify(body),
      }),
    });
    if (!response.ok) console.error(`Failed to put group: ${response.status}`);
  } catch (error) {
    console.error("Error putting group:", error);
  }
}

const debouncedPutGroup = debounce(putGroup, 1000);

function useApiSync() {
  const initialize = useStore((state) => state.initialize);
  const store = useStore((state) => state);
  const groupId = window.location.pathname.slice(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGroup() {
      try {
        setIsLoading(true);
        const data = await getGroup(groupId);
        if (data) initialize(data);
      } finally {
        setIsLoading(false);
      }
    }
    if (groupId) loadGroup();
  }, [groupId, initialize]);

  useEffect(() => {
    if (groupId) debouncedPutGroup(groupId, store);
  }, [store, groupId]);

  return { isLoading };
}

function TaskList() {
  const groups = useStore((state) => state.groups);
  const tasks = useStore((state) => state.tasks);

  return (
    <>
      {groups.map((group) => {
        const groupTasks = tasks.filter((task) => task.groupId === group.id);
        if (!groupTasks.length) return null;

        return (
          <div key={group.id}>
            <h3 className="pb-1 text-neutral-500">{group.name}</h3>
            <ul>
              {groupTasks.map((task) => (
                <TaskItem key={task.id} task={task} group={group} />
              ))}
            </ul>
          </div>
        );
      })}
      <ul>
        {tasks
          .filter((task) => !task.groupId)
          .map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
      </ul>
    </>
  );
}

function TaskItem({ task, group }: { task: Task; group?: Group }) {
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const groups = useStore((state) => state.groups);
  const setTaskGroup = useStore((state) => state.setTaskGroup);
  const deleteGroup = useStore((state) => state.deleteGroup);
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
                "flex flex-col",
                "z-50 bg-neutral-300 p-2",
                "focus:outline-none",
              )}
            >
              {group ? (
                <ContextMenu.Item key={group.id} asChild>
                  <Button
                    onSelect={() => setTaskGroup(task.id, undefined)}
                    className="justify-start px-3 text-neutral-700 w-full"
                  >
                    Ungroup
                  </Button>
                </ContextMenu.Item>
              ) : null}
              {groups
                .filter((g) => g.id !== task.groupId)
                .map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <ContextMenu.Item asChild>
                      <Button
                        onClick={() => setTaskGroup(task.id, g.id)}
                        className="justify-start px-3 text-neutral-700 flex-1"
                      >
                        Add to {g.name}
                      </Button>
                    </ContextMenu.Item>
                    <Button onClick={() => deleteGroup(g.id)}>
                      <Minus className="size-5" />
                    </Button>
                  </div>
                ))}
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
    if (!title.trim()) return;
    addTask({ title });
    setTitle("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-neutral-600 relative"
    >
      <div className="flex items-center gap-2">
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
      </div>
    </form>
  );
}

export function App() {
  const { isLoading } = useApiSync();

  return (
    <div className="max-w-2xl mx-auto p-16 flex flex-col gap-16">
      {isLoading ? (
        <div className="flex items-center justify-center animate-spin">
          <Plus className="size-5 text-neutral-600" />
        </div>
      ) : (
        <>
          <TaskList />
          <TaskForm />
        </>
      )}
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
