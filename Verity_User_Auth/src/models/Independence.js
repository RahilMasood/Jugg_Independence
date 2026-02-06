const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Independence Model
 * Tracks independence submissions for users
 */
const Independence = sequelize.define('Independence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Reference to user'
  },
  submitted: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false,
    comment: 'List of submitted items (JSON array)'
  }
}, {
  tableName: 'independence',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] }
  ]
});

module.exports = Independence;

