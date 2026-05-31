import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Task Tracker API',
      version: '1.0.0',
      description:
        'A REST API for managing tasks within a team. Supports authentication, RBAC, caching, and real-time notifications.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Error ──────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'due_date must be a future date' },
          },
        },
        // ── Auth ───────────────────────────────────────────────
        RegisterInput: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string', example: 'John Admin' },
            email: { type: 'string', format: 'email', example: 'admin@test.com' },
            password: { type: 'string', example: 'Password123' },
            orgName: { type: 'string', example: 'Test Org' },
            orgSlug: { type: 'string', example: 'test-org' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@test.com' },
            password: { type: 'string', example: 'Password123' },
          },
        },
        // ── User ───────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'MEMBER'] },
            isActive: { type: 'boolean' },
            orgId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Project ────────────────────────────────────────────
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            orgId: { type: 'string', format: 'uuid' },
            createdById: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                tasks: { type: 'integer' },
              },
            },
          },
        },
        // ── Task ───────────────────────────────────────────────
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            },
            dueDate: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            projectId: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            assignee: { $ref: '#/components/schemas/User' },
            creator: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title', 'projectId'],
          properties: {
            title: { type: 'string', example: 'Design homepage' },
            description: { type: 'string', example: 'Create wireframes' },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
              default: 'MEDIUM',
            },
            projectId: { type: 'string', format: 'uuid' },
            assigneeId: { type: 'string', format: 'uuid' },
            dueDate: { type: 'string', format: 'date', example: '2026-12-31' },
          },
        },
        UpdateTaskStatusInput: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            },
          },
        },
        // ── Pagination Meta ────────────────────────────────────
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management (ADMIN only)' },
      { name: 'Projects', description: 'Project management (ADMIN + MANAGER)' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Analytics', description: 'Analytics (ADMIN + MANAGER)' },
      { name: 'Notifications', description: 'SSE real-time notifications' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
