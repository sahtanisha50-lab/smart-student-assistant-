'use strict';

const Client = require('../models/Client');
const { broadcast } = require('../sse');

async function listClients(req, res) {
  const clients = await Client.find({ userId: req.userId }).sort({ updatedAt: -1 });
  res.json({ clients });
}

async function getClient(req, res) {
  const { id } = req.params;
  const client = await Client.findOne({ _id: id, userId: req.userId });
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ client });
}

async function createClient(req, res) {
  const { name, email, riskScore, meta } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const client = await Client.create({ userId: req.userId, name, email, riskScore, meta });
  try { broadcast('client:created', client); } catch (_e) {}
  res.status(201).json({ client });
}

async function updateClient(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  const client = await Client.findOneAndUpdate({ _id: id, userId: req.userId }, { $set: payload }, { new: true });
  if (!client) return res.status(404).json({ error: 'Not found' });
  try { broadcast('client:updated', client); } catch (_e) {}
  res.json({ client });
}

async function deleteClient(req, res) {
  const { id } = req.params;
  const deleted = await Client.findOneAndDelete({ _id: id, userId: req.userId });
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
}

module.exports = { listClients, getClient, createClient, updateClient, deleteClient };
