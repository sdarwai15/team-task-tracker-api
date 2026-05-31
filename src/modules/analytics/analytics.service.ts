import { prisma } from '../../config/db';

// ── Overdue tasks count per user ───────────────────────────────────────────

export const getOverdueTasksPerUser = async (orgId: string) => {
  const now = new Date();

  const overdueTasks = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: {
      orgId,
      dueDate: { lt: now },
      status: { notIn: ['DONE', 'BLOCKED'] },
      assigneeId: { not: null },
    },
    _count: { id: true },
  });

  if (overdueTasks.length === 0) return [];

  // Fetch user details for all assignees found
  const assigneeIds = overdueTasks
    .map((t) => t.assigneeId)
    .filter((id): id is string => id !== null);

  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, fullName: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return overdueTasks.map((t) => ({
    user: userMap.get(t.assigneeId!) ?? null,
    overdueCount: t._count.id,
  }));
};

// ── Average completion time per user ──────────────────────────────────────
// Uses raw SQL for AVG + EXTRACT — demonstrates SQL aggregation as required

export const getAvgCompletionTime = async (orgId: string) => {
  type RawResult = {
    user_id: string;
    full_name: string;
    email: string;
    completed_count: bigint;
    avg_hours: number | null;
  };

  const results = await prisma.$queryRaw<RawResult[]>`
    SELECT
      u.id           AS user_id,
      u.full_name,
      u.email,
      COUNT(t.id)    AS completed_count,
      AVG(
        EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600
      )              AS avg_hours
    FROM tasks t
    JOIN users u ON u.id = t.assignee_id
    WHERE
      t.org_id       = ${orgId}
      AND t.status   = 'DONE'
      AND t.completed_at IS NOT NULL
    GROUP BY u.id, u.full_name, u.email
    ORDER BY avg_hours ASC
  `;

  return results.map((r) => ({
    user: {
      id: r.user_id,
      fullName: r.full_name,
      email: r.email,
    },
    completedCount: Number(r.completed_count),
    avgCompletionHours: r.avg_hours ? parseFloat(r.avg_hours.toFixed(2)) : null,
  }));
};

// ── Combined summary ───────────────────────────────────────────────────────

export const getAnalyticsSummary = async (orgId: string) => {
  const [overduePerUser, avgCompletionTime] = await Promise.all([
    getOverdueTasksPerUser(orgId),
    getAvgCompletionTime(orgId),
  ]);

  // Overall org stats
  const [totalTasks, doneTasks, overdueTasks] = await Promise.all([
    prisma.task.count({ where: { orgId } }),
    prisma.task.count({ where: { orgId, status: 'DONE' } }),
    prisma.task.count({
      where: {
        orgId,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'BLOCKED'] },
      },
    }),
  ]);

  return {
    summary: {
      totalTasks,
      doneTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? parseFloat(((doneTasks / totalTasks) * 100).toFixed(2)) : 0,
    },
    overduePerUser,
    avgCompletionTime,
  };
};
