/**
 * Models Index
 * Exports all Sequelize models for easy importing
 */

const User = require('./User');
const AuditClient = require('./AuditClient');
const Engagement = require('./Engagement');
const EngagementUser = require('./EngagementUser');
const Firm = require('./Firm');
const RefreshToken = require('./RefreshToken');
const AuditLog = require('./AuditLog');
const Permission = require('./Permission');
const Role = require('./Role');
const Client = require('./Client');
const ConfirmationRequest = require('./ConfirmationRequest');
const IndependenceDeclaration = require('./IndependenceDeclaration');
const Independence = require('./Independence');

// Define all models
const models = {
  User,
  AuditClient,
  Engagement,
  EngagementUser,
  Firm,
  RefreshToken,
  AuditLog,
  Permission,
  Role,
  Client,
  ConfirmationRequest,
  IndependenceDeclaration,
  Independence
};

// Initialize associations if they exist
if (typeof Engagement.associate === 'function') {
  Engagement.associate(models);
}

if (typeof User.associate === 'function') {
  User.associate(models);
}

if (typeof Firm.associate === 'function') {
  Firm.associate(models);
}

if (typeof AuditClient.associate === 'function') {
  AuditClient.associate(models);
}

module.exports = models;

