import type { Client, ReminderItem, Task, AppSettings } from '../types';
import { monthsSince, daysUntil } from './age';

function birthdayThisYear(dob: string): Date {
  const birth = new Date(dob);
  const now = new Date();
  const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < new Date(now.toDateString())) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
}

export function buildReminders(
  clients: Client[],
  tasks: Task[],
  settings: AppSettings,
): ReminderItem[] {
  const reminders: ReminderItem[] = [];
  const cadence = settings.visitCadenceMonths ?? 6;

  for (const client of clients) {
    const months = monthsSince(client.lastVisitDate);
    if (months === null || months >= cadence) {
      const overdueBy = months === null ? null : months - cadence;
      reminders.push({
        id: `visit-${client.id}`,
        kind: 'visit',
        urgency: months === null || months >= cadence + 1 ? 'overdue' : 'soon',
        title: `${client.name} is due for a visit`,
        detail:
          months === null
            ? 'No meeting logged yet'
            : `Last visit ${months} month${months === 1 ? '' : 's'} ago (${overdueBy && overdueBy > 0 ? `${overdueBy}mo overdue` : 'due now'})`,
        date: client.lastVisitDate,
        clientId: client.id,
      });
    }

    if (client.dob) {
      const next = birthdayThisYear(client.dob);
      const days = daysUntil(next.toISOString());
      if (days !== null && days <= 30) {
        reminders.push({
          id: `birthday-${client.id}`,
          kind: 'birthday',
          urgency: days <= 3 ? 'overdue' : days <= 7 ? 'soon' : 'upcoming',
          title: `${client.name}'s birthday`,
          detail: days === 0 ? 'Today!' : `In ${days} day${days === 1 ? '' : 's'}`,
          date: next.toISOString(),
          clientId: client.id,
        });
      }
    }
  }

  for (const task of tasks) {
    if (task.status === 'done' || !task.dueDate) continue;
    const days = daysUntil(task.dueDate);
    if (days === null) continue;
    if (days <= 14) {
      reminders.push({
        id: `task-${task.id}`,
        kind: 'task',
        urgency: days < 0 ? 'overdue' : days <= 3 ? 'soon' : 'upcoming',
        title: task.description,
        detail: days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : `Due in ${days} day${days === 1 ? '' : 's'}`,
        date: task.dueDate,
        clientId: task.clientId,
      });
    }
  }

  const urgencyRank: Record<ReminderItem['urgency'], number> = { overdue: 0, soon: 1, upcoming: 2 };
  return reminders.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
}

export function isOverdue(client: Client, cadenceMonths: number): boolean {
  const months = monthsSince(client.lastVisitDate);
  return months === null || months >= cadenceMonths;
}

export function isDueSoon(client: Client, cadenceMonths: number): boolean {
  const months = monthsSince(client.lastVisitDate);
  if (months === null) return false;
  return months >= cadenceMonths - 1 && months < cadenceMonths;
}
