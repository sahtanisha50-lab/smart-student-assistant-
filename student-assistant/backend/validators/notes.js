'use strict';

const { z } = require('zod');

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional()
});

module.exports = { createNoteSchema, updateNoteSchema };
