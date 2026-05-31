import supertest from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { cleanupTestData, createTestOrg } from './helpers/testDb';
import { connectRedis } from '../src/config/redis';

const request = supertest(app);

let orgId: string;
let adminToken: string;
let memberToken: string;
let memberId: string;
let projectId: string;
let taskId: string;

beforeAll(async () => {
  await connectRedis();

  // Create isolated test org
  const orgSlug = `test-tasks-${Date.now()}`;
  const org = await createTestOrg(orgSlug);
  orgId = org.id;

  // Register admin
  const adminEmail = `admin-tasks-${Date.now()}@test.com`;
  await request.post('/api/v1/auth/register').send({
    fullName: 'Task Admin',
    email: adminEmail,
    password: 'Password123',
    orgSlug,
  });

  // Promote to ADMIN directly in DB (register creates MEMBER for existing orgs)
  await prisma.user.updateMany({
    where: { email: adminEmail },
    data: { role: 'ADMIN' },
  });

  const adminLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: 'Password123' });
  adminToken = adminLogin.body.data.accessToken;

  // Register member in same org
  const memberEmail = `member-tasks-${Date.now()}@test.com`;
  await request.post('/api/v1/auth/register').send({
    fullName: 'Task Member',
    email: memberEmail,
    password: 'Password123',
    orgSlug,
  });

  const memberLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: memberEmail, password: 'Password123' });
  memberToken = memberLogin.body.data.accessToken;
  memberId = memberLogin.body.data.user.id;

  // Create a project
  const projectRes = await request
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Project' });
  projectId = projectRes.body.data.project.id;

  // Create a task assigned to member
  const taskRes = await request
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Test Task',
      priority: 'HIGH',
      projectId,
      assigneeId: memberId,
      dueDate: '2026-12-31',
    });
  taskId = taskRes.body.data.task.id;
});

afterAll(async () => {
  await cleanupTestData(orgId);
  await prisma.$disconnect();
});

// ── Task creation ──────────────────────────────────────────────────────────

describe('POST /api/v1/tasks', () => {
  it('should create a task with valid data', async () => {
    const res = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Task',
        priority: 'MEDIUM',
        projectId,
        dueDate: '2026-12-31',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('New Task');
    expect(res.body.data.task.status).toBe('TODO');
    expect(res.body.data.task.priority).toBe('MEDIUM');
  });

  it('should reject task with past due date', async () => {
    const res = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Past Due Task',
        projectId,
        dueDate: '2020-01-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject task with missing title', async () => {
    const res = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject task with invalid projectId', async () => {
    const res = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Bad Project Task',
        projectId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

// ── Status machine ─────────────────────────────────────────────────────────

describe('PATCH /api/v1/tasks/:id/status — state machine', () => {
  it('should transition TODO → IN_PROGRESS', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('IN_PROGRESS');
  });

  it('should reject invalid transition IN_PROGRESS → DONE', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should transition IN_PROGRESS → IN_REVIEW', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_REVIEW' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('IN_REVIEW');
  });

  it('should transition IN_REVIEW → DONE and set completedAt', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('DONE');
    expect(res.body.data.task.completedAt).not.toBeNull();
  });

  it('should reject any transition from DONE', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

// ── RBAC on tasks ──────────────────────────────────────────────────────────

describe('Task RBAC enforcement', () => {
  let newTaskId: string;

  beforeAll(async () => {
    // Create a fresh task for RBAC tests
    const taskRes = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'RBAC Test Task',
        projectId,
        assigneeId: memberId,
        dueDate: '2026-12-31',
      });
    newTaskId = taskRes.body.data.task.id;
  });

  it('should allow member to view their own assigned task', async () => {
    const res = await request
      .get(`/api/v1/tasks/${newTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
  });

  it('should block member from viewing unassigned task', async () => {
    // Create task NOT assigned to member
    const unassignedTask = await request
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Unassigned Task',
        projectId,
        dueDate: '2026-12-31',
      });

    const res = await request
      .get(`/api/v1/tasks/${unassignedTask.body.data.task.id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should block member from deleting a task', async () => {
    const res = await request
      .delete(`/api/v1/tasks/${newTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should allow member to update status of their assigned task', async () => {
    const res = await request
      .patch(`/api/v1/tasks/${newTaskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
  });

  it('should block member from accessing users endpoint', async () => {
    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ── Pagination and filtering ───────────────────────────────────────────────

describe('GET /api/v1/tasks — pagination and filtering', () => {
  it('should return paginated results', async () => {
    const res = await request
      .get('/api/v1/tasks?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.meta).toHaveProperty('total');
    expect(res.body.data.meta).toHaveProperty('page');
    expect(res.body.data.meta).toHaveProperty('totalPages');
    expect(res.body.data.tasks.length).toBeLessThanOrEqual(2);
  });

  it('should filter by status', async () => {
    const res = await request
      .get('/api/v1/tasks?status=TODO')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.tasks.forEach((task: { status: string }) => {
      expect(task.status).toBe('TODO');
    });
  });

  it('should filter by assignee', async () => {
    const res = await request
      .get(`/api/v1/tasks?assigneeId=${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.tasks.forEach((task: { assignee: { id: string } | null }) => {
      expect(task.assignee?.id).toBe(memberId);
    });
  });

  it('member should only see their own tasks in list', async () => {
    const res = await request
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    res.body.data.tasks.forEach((task: { assignee: { id: string } | null }) => {
      expect(task.assignee?.id).toBe(memberId);
    });
  });
});