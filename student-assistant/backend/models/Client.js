'use strict';

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    riskScore: { type: Number, default: null },
    meta: { type: Object }
  },
  { timestamps: true }
);

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;
