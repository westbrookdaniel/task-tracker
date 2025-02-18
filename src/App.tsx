// build the frontend for this

import { create } from "zustand";
import { persist } from "zustand/middleware";

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message ?? "Error"}`);
}

interface Task {
  title: string;
  value?: number;
  upgrade?: boolean;
  group?: string;
}

interface State {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (title: string, newTask: Partial<Task>) => void;
  deleteTask: (title: string) => void;
}

const useState = create<State>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task: Task) =>
        set((state) => {
          assert(task !== null);
          assert(task !== undefined);
          const doesTaskExist = state.tasks.find((t) => t.title === task.title);
          assert(doesTaskExist === undefined);

          const newTasks = [...state.tasks, task];
          assert(newTasks.length === state.tasks.length + 1);

          return { tasks: newTasks };
        }),
      updateTask: (title: string, newTask: Partial<Task>) =>
        set((state) => {
          assert(title !== null);
          assert(title !== undefined);
          assert(newTask !== null);
          assert(newTask !== undefined);

          const taskToUpdateIndex = state.tasks.findIndex(
            (task) => task.title === title,
          );
          assert(taskToUpdateIndex !== -1);

          const newTasks = [...state.tasks];
          newTasks[taskToUpdateIndex] = {
            ...newTasks[taskToUpdateIndex],
            ...newTask,
          };

          return { tasks: newTasks };
        }),
      deleteTask: (title: string) =>
        set((state) => {
          assert(title !== null);
          assert(title !== undefined);

          const taskToDeleteIndex = state.tasks.findIndex(
            (task) => task.title === title,
          );
          assert(taskToDeleteIndex !== -1);

          const newTasks = state.tasks.filter((task) => task.title !== title);
          assert(newTasks.length === state.tasks.length - 1);

          return { tasks: newTasks };
        }),
    }),
    { name: "dan-tasks-storage" },
  ),
);

export function App() {
  return <div className=""></div>;
}
