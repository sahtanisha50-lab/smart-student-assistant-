'use strict';

const { z } = require('zod');

const createReminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' }),
  type: z.string().optional(),
  notes: z.string().optional()
});

const updateReminderSchema = z.object({
  title: z.string().min(1).optional(),
  dueAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' }).optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional()
});

module.exports = { createReminderSchema, updateReminderSchema };
