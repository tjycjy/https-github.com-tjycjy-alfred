import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { Task } from '../types';

export async function listAllTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.getAll('tasks');
}

export async function listTasksForClient(clientId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllFromIndex('tasks', 'clientId', clientId);
}

export async function createTask(input: {
  clientId: string | null;
  description: string;
  dueDate: string | null;
  sourceMeetingId?: string | null;
}): Promise<Task> {
  const db = await getDb();
  const task: Task = {
    id: newId(),
    clientId: input.clientId,
    description: input.description,
    dueDate: input.dueDate,
    status: 'open',
    createdAt: nowIso(),
    sourceMeetingId: input.sourceMeetingId ?? null,
  };
  await db.put('tasks', task);
  return task;
}

export async function updateTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.put('tasks', task);
}

export async function setTaskStatus(id: string, status: Task['status']): Promise<void> {
  const db = await getDb();
  const task = await db.get('tasks', id);
  if (!task) return;
  task.status = status;
  await db.put('tasks', task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('tasks', id);
}
