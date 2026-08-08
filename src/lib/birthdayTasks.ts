import type { Client, Task } from '../types';
import { createTask } from '../db/tasks';

// How far ahead of a client's birthday to add the reminder task — long enough to plan a call,
// card, or gift, short enough that it isn't just noise in the task list all year round.
const LEAD_DAYS = 14;
const TASK_PREFIX = '🎂 Wish';

function nextBirthday(dob: string, from: Date): Date {
  const birth = new Date(dob);
  const next = new Date(from.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < new Date(from.toDateString())) next.setFullYear(from.getFullYear() + 1);
  return next;
}

// Creates a "wish {client} happy birthday" task once their next birthday is within LEAD_DAYS,
// due on the birthday itself. Idempotent: keyed on (clientId, exact due date) so re-running on
// every app load never creates duplicates for the same year's birthday.
export async function syncBirthdayTasks(clients: Client[], existingTasks: Task[]): Promise<boolean> {
  const now = new Date();
  let created = false;

  for (const client of clients) {
    if (!client.dob) continue;
    const next = nextBirthday(client.dob, now);
    const daysAway = Math.round((new Date(next.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000);
    if (daysAway < 0 || daysAway > LEAD_DAYS) continue;

    const dueDate = next.toISOString();
    const alreadyExists = existingTasks.some(
      (t) => t.clientId === client.id && t.dueDate === dueDate && t.description.startsWith(TASK_PREFIX),
    );
    if (alreadyExists) continue;

    await createTask({ clientId: client.id, description: `${TASK_PREFIX} ${client.name} a happy birthday`, dueDate });
    created = true;
  }

  return created;
}
