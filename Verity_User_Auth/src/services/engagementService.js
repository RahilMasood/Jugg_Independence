const { Engagement, User, AuditClient, EngagementUser } = require('../models');
const policyService = require('./policyService');
const authService = require('./authService');
const logger = require('../utils/logger');

class EngagementService {
  /**
   * Create new engagement
   */
  async createEngagement(engagementData, createdBy) {
    try {
      // Check if user has permission to create engagement
      const canCreate = await policyService.canCreateEngagement(createdBy);
      
      if (!canCreate) {
        throw new Error('User does not have permission to create engagements');
      }

      // Get user's firm
      const user = await User.findByPk(createdBy);
      if (!user) {
        throw new Error('User not found');
      }

      // Create engagement
      const engagement = await Engagement.create({
        firm_id: user.firm_id,
        name: engagementData.name,
        client_name: engagementData.client_name,
        description: engagementData.description,
        start_date: engagementData.start_date,
        end_date: engagementData.end_date,
        status: engagementData.status || 'ACTIVE',
        created_by: createdBy
      });

      // Automatically add creator to engagement team as LEAD
      await this.addUserToEngagement(engagement.id, createdBy, 'LEAD', createdBy);

      // Log engagement creation
      await authService.logAuditEvent(
        createdBy,
        user.firm_id,
        'CREATE_ENGAGEMENT',
        'ENGAGEMENT',
        engagement.id,
        { name: engagement.name, client_name: engagement.client_name },
        null,
        null,
        'SUCCESS'
      );

      return engagement;
    } catch (error) {
      logger.error('Create engagement error:', error);
      throw error;
    }
  }

  /**
   * Get engagement by ID with access check
   */
  async getEngagement(engagementId, userId) {
    try {
      const engagement = await Engagement.findByPk(engagementId, {
        include: [
          {
            model: AuditClient,
            as: 'auditClient',
            attributes: ['id', 'client_name', 'status', 'firm_id']
          },
          {
            model: User,
            as: 'teamMembers',
            attributes: ['id', 'user_name', 'email', 'type'],
            through: { attributes: ['role'] }
          }
        ]
      });

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      // Check if this is a default engagement - don't allow access to default/placeholder engagements
      if (engagement.is_default === true) {
        throw new Error('Engagement not available - default engagement is not accessible');
      }

      // Check if client status is Active - don't allow access to engagements with Pending clients
      if (engagement.auditClient && engagement.auditClient.status !== 'Active') {
        throw new Error('Engagement not available - client status is not Active');
      }

      // Check if user has access to this engagement
      const hasAccess = await this.checkUserAccess(engagementId, userId);
      
      if (!hasAccess) {
        throw new Error('Access denied to this engagement');
      }

      return engagement;
    } catch (error) {
      logger.error('Get engagement error:', error);
      throw error;
    }
  }

  /**
   * List engagements user has access to
   * Returns all engagements where the user is a team member (via engagement_users table)
   * @param {string} userId - User ID
   * @param {object} filters - Filters object (status, client_name, client_id, audit_client_id, for_confirmation_tool, for_main_access, for_main)
   * @param {object} pagination - Pagination object (page, limit, sort_by, sort_order)
   * @param {boolean} filters.for_confirmation_tool - If true, only return engagements where confirmation_tool = true
   * @param {boolean} filters.for_main_access - If true, only return engagements where main = true AND confirmation_tool = false
   * @param {boolean} filters.for_main - If true, only return engagements where main = true (regardless of confirmation_tool)
   * @param {string} filters.client_id - Filter by client ID (audit_client_id)
   */
  async listEngagements(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 100, sort_by = 'created_at', sort_order = 'DESC' } = pagination;
      const offset = (page - 1) * limit;
      const { Op } = require('sequelize');
      
      // Import Op at the top level to use throughout the function

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Build where clause for engagements
      // Exclude default engagements created during client onboarding
      const engagementWhere = {
        is_default: false // Don't display default/placeholder engagements
      };
      if (filters.status) {
        engagementWhere.status = filters.status;
      }
      // NOTE: Don't set client_id filter here if for_main_access is true
      // We'll filter by client_id after getting eligible engagement IDs from the subquery
      // This ensures the subquery runs first, then we filter by client_id
      if (filters.for_main_access !== true) {
        // Filter by client_id (audit_client_id) if provided (only if NOT using for_main_access)
        if (filters.client_id || filters.audit_client_id) {
          engagementWhere.audit_client_id = filters.client_id || filters.audit_client_id;
          logger.info(`[listEngagements] Filtering by client_id: ${filters.client_id || filters.audit_client_id}`);
        }
      }

      // Build where clause for audit client (if filtering by client_name)
      // Only show engagements for clients with status 'Active'
      const clientWhere = {
        status: 'Active' // Only display engagements for Active clients
      };
      if (filters.client_name) {
        clientWhere.client_name = { [Op.iLike]: `%${filters.client_name}%` };
      }

      // Build through clause for engagement_users
      // Priority order:
      // 1. for_main_access (main = true AND confirmation_tool = false) - highest priority
      // 2. for_main (main = true, regardless of confirmation_tool)
      // 3. for_confirmation_tool (confirmation_tool = true)
      let throughWhere;
      
      // If filtering for main access (main dashboard), only show engagements with main = true AND confirmation_tool = false
      // This takes precedence over for_confirmation_tool
      if (filters.for_main_access === true) {
        // First, find engagement IDs where user has main=true AND confirmation_tool=false
        // This subquery approach ensures boolean false is handled correctly
        // We'll filter by client_id after getting the engagement IDs
        const eligibleEngagements = await EngagementUser.findAll({
          where: {
            user_id: userId,
            main: true,
            confirmation_tool: false // Direct boolean false - Sequelize handles this correctly in direct queries
          },
          attributes: ['engagement_id'],
          raw: true
        });
        
        let eligibleEngagementIds = eligibleEngagements.map(e => e.engagement_id);
        logger.info(`[listEngagements] Found ${eligibleEngagementIds.length} eligible engagements for user ${userId} with main=true AND confirmation_tool=false`);
        
        // If client_id filter is provided, further filter by client_id
        if ((filters.client_id || filters.audit_client_id) && eligibleEngagementIds.length > 0) {
          const clientId = filters.client_id || filters.audit_client_id;
          const engagementsForClient = await Engagement.findAll({
            where: {
              id: { [Op.in]: eligibleEngagementIds },
              audit_client_id: clientId
            },
            attributes: ['id'],
            raw: true
          });
          eligibleEngagementIds = engagementsForClient.map(e => e.id);
          logger.info(`[listEngagements] After client_id filter: ${eligibleEngagementIds.length} eligible engagements`);
        }
        
        // Add engagement ID filter to engagementWhere
        if (eligibleEngagementIds.length > 0) {
          engagementWhere.id = { [Op.in]: eligibleEngagementIds };
        } else {
          // If no eligible engagements, set a condition that will return no results
          engagementWhere.id = { [Op.in]: [] };
        }
        
        // Set throughWhere to just filter by user_id (the engagement ID filter above handles the main/confirmation_tool filtering)
        throughWhere = {
          user_id: userId
        };
        logger.info(`[listEngagements] Using subquery approach: filtered ${eligibleEngagementIds.length} engagement IDs`);
      } else {
        throughWhere = {
          user_id: userId
        };
        
        // If filtering for main (all main engagements), only show engagements with main = true
        if (filters.for_main === true) {
          throughWhere.main = true;
          logger.info(`[listEngagements] Filtering by main = true for user ${userId}`);
        }
        // If filtering for confirmation tool portal, only show engagements with confirmation_tool = true
        // Only apply this if for_main_access is NOT set
        else if (filters.for_confirmation_tool === true) {
          throughWhere.confirmation_tool = true;
          logger.info(`[listEngagements] Filtering by confirmation_tool = true for user ${userId}`);
        } else {
          logger.info(`[listEngagements] NOT filtering by confirmation_tool for user ${userId} (for_confirmation_tool: ${filters.for_confirmation_tool}, for_main_access: ${filters.for_main_access})`);
        }
      }

      // Log the filters being applied
      logger.info(`[listEngagements] engagementWhere: ${JSON.stringify(engagementWhere)}`);
      logger.info(`[listEngagements] clientWhere: ${JSON.stringify(clientWhere)}`);
      logger.info(`[listEngagements] throughWhere: ${JSON.stringify(throughWhere, (key, value) => {
        // Custom JSON stringify to handle Op.eq objects
        if (value && typeof value === 'object' && value[Op.eq] !== undefined) {
          return `{Op.eq: ${value[Op.eq]}}`;
        }
        return value;
      })}`);

      // Get engagements where user is a team member via engagement_users
      const { rows: engagements, count: total } = await Engagement.findAndCountAll({
        where: engagementWhere,
        include: [
          {
            model: AuditClient,
            as: 'auditClient',
            where: clientWhere,
            required: true,
            attributes: ['id', 'client_name', 'status', 'firm_id']
          },
          {
            model: User,
            as: 'teamMembers',
            through: {
              where: throughWhere,
              attributes: ['role', 'confirmation_tool', 'sampling_tool', 'independence_tool', 'main'] // Include role and tool flags from EngagementUser junction table
            },
            attributes: ['id', 'user_name', 'email', 'type'],
            required: true // Only get engagements where user is a team member
          }
        ],
        attributes: ['id', 'audit_client_id', 'status', 'is_default', 'engagement_name', 'created_at', 'updated_at'],
        limit,
        offset,
        order: [[sort_by, sort_order]],
        distinct: true
      });

      logger.info(`[listEngagements] Found ${engagements.length} engagements for user ${userId} with filters applied`);
      
      // Debug: Log each engagement's confirmation_tool status
      if (filters.for_main_access === true && engagements.length > 0) {
        logger.info(`[listEngagements] DEBUG - Engagements returned with for_main_access filter:`);
        engagements.forEach(eng => {
          const engData = eng.toJSON();
          const teamMember = engData.teamMembers?.[0];
          const engagementUser = teamMember?.EngagementUser;
          logger.info(`  - ${engData.engagement_name || engData.id}: main=${engagementUser?.main}, confirmation_tool=${engagementUser?.confirmation_tool}`);
        });
      }

      // Format the response to include client_name and engagement_name
      const formattedEngagements = engagements.map(engagement => {
        const engagementData = engagement.toJSON();
        // Format teamMembers to include role and tool flags from through table
        const formattedTeamMembers = (engagementData.teamMembers || []).map(member => {
          const engagementUser = member.EngagementUser || {};
          return {
            id: member.id,
            user_name: member.user_name,
            email: member.email,
            type: member.type,
            role: engagementUser.role || null, // Extract role from through table
            main: engagementUser.main !== undefined ? engagementUser.main : null, // Extract main from through table
            confirmation_tool: engagementUser.confirmation_tool !== undefined ? engagementUser.confirmation_tool : null, // Extract confirmation_tool from through table
            sampling_tool: engagementUser.sampling_tool !== undefined ? engagementUser.sampling_tool : null, // Extract sampling_tool from through table
            independence_tool: engagementUser.independence_tool !== undefined ? engagementUser.independence_tool : null // Extract independence_tool from through table
          };
        });
        
        return {
          id: engagementData.id,
          audit_client_id: engagementData.audit_client_id,
          status: engagementData.status,
          is_default: engagementData.is_default,
          engagement_name: engagementData.engagement_name,
          client_name: engagementData.auditClient?.client_name,
          teamMembers: formattedTeamMembers,
          created_at: engagementData.created_at,
          updated_at: engagementData.updated_at
        };
      });

      return {
        engagements: formattedEngagements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('List engagements error:', error);
      throw error;
    }
  }

  /**
   * Get engagements for "Grant Confirmation Tool Access" dialog
   * Returns engagements where user has main=true AND confirmation_tool=false
   * This is a dedicated method that doesn't conflict with JWT application_type
   * @param {string} userId - User ID
   * @param {string} clientId - Optional client ID to filter by
   */
  async getEngagementsForConfirmationToolAccess(userId, clientId = null) {
    try {
      const { Op } = require('sequelize');
      
      logger.info(`[getEngagementsForConfirmationToolAccess] Getting engagements for user ${userId}${clientId ? ` with client_id ${clientId}` : ''}`);

      // First, find engagement IDs where user has main=true AND confirmation_tool=false
      const eligibleEngagements = await EngagementUser.findAll({
        where: {
          user_id: userId,
          main: true,
          confirmation_tool: false
        },
        attributes: ['engagement_id'],
        raw: true
      });

      let eligibleEngagementIds = eligibleEngagements.map(e => e.engagement_id);
      logger.info(`[getEngagementsForConfirmationToolAccess] Found ${eligibleEngagementIds.length} eligible engagements with main=true AND confirmation_tool=false`);

      // If client_id filter is provided, further filter by client_id
      if (clientId && eligibleEngagementIds.length > 0) {
        const engagementsForClient = await Engagement.findAll({
          where: {
            id: { [Op.in]: eligibleEngagementIds },
            audit_client_id: clientId
          },
          attributes: ['id'],
          raw: true
        });
        eligibleEngagementIds = engagementsForClient.map(e => e.id);
        logger.info(`[getEngagementsForConfirmationToolAccess] After client_id filter: ${eligibleEngagementIds.length} eligible engagements`);
      }

      if (eligibleEngagementIds.length === 0) {
        logger.info(`[getEngagementsForConfirmationToolAccess] No eligible engagements found`);
        return [];
      }

      // Get the full engagement data
      const engagements = await Engagement.findAll({
        where: {
          id: { [Op.in]: eligibleEngagementIds },
          is_default: false
        },
        include: [
          {
            model: AuditClient,
            as: 'auditClient',
            where: { status: 'Active' },
            required: true,
            attributes: ['id', 'client_name', 'status', 'firm_id']
          },
          {
            model: User,
            as: 'teamMembers',
            through: {
              where: { user_id: userId },
              attributes: ['role', 'confirmation_tool', 'sampling_tool', 'independence_tool', 'main']
            },
            attributes: ['id', 'user_name', 'email', 'type'],
            required: true
          }
        ],
        attributes: ['id', 'audit_client_id', 'status', 'is_default', 'engagement_name', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']]
      });

      // Format the response
      const formattedEngagements = engagements.map(engagement => {
        const engagementData = engagement.toJSON();
        const formattedTeamMembers = (engagementData.teamMembers || []).map(member => {
          const engagementUser = member.EngagementUser || {};
          return {
            id: member.id,
            user_name: member.user_name,
            email: member.email,
            type: member.type,
            role: engagementUser.role || null,
            main: engagementUser.main !== undefined ? engagementUser.main : null,
            confirmation_tool: engagementUser.confirmation_tool !== undefined ? engagementUser.confirmation_tool : null,
            sampling_tool: engagementUser.sampling_tool !== undefined ? engagementUser.sampling_tool : null,
            independence_tool: engagementUser.independence_tool !== undefined ? engagementUser.independence_tool : null
          };
        });

        return {
          id: engagementData.id,
          audit_client_id: engagementData.audit_client_id,
          status: engagementData.status,
          is_default: engagementData.is_default,
          engagement_name: engagementData.engagement_name,
          client_name: engagementData.auditClient?.client_name,
          teamMembers: formattedTeamMembers,
          created_at: engagementData.created_at,
          updated_at: engagementData.updated_at
        };
      });

      logger.info(`[getEngagementsForConfirmationToolAccess] Returning ${formattedEngagements.length} engagements`);
      return formattedEngagements;
    } catch (error) {
      logger.error('Get engagements for confirmation tool access error:', error);
      throw error;
    }
  }

  /**
   * Update engagement
   */
  async updateEngagement(engagementId, updateData, updatedBy) {
    try {
      const engagement = await Engagement.findByPk(engagementId);

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      // Check if user has access
      const hasAccess = await this.checkUserAccess(engagementId, updatedBy);
      
      if (!hasAccess) {
        throw new Error('Access denied to this engagement');
      }

      // Update allowed fields
      const allowedFields = ['name', 'client_name', 'description', 'start_date', 'end_date', 'status'];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          engagement[field] = updateData[field];
        }
      }

      await engagement.save();

      // Log engagement update - get firm_id from auditClient
      const auditClient = await AuditClient.findByPk(engagement.audit_client_id);
      const firmId = auditClient ? auditClient.firm_id : null;
      
      await authService.logAuditEvent(
        updatedBy,
        firmId,
        'UPDATE_ENGAGEMENT',
        'ENGAGEMENT',
        engagement.id,
        updateData,
        null,
        null,
        'SUCCESS'
      );

      return engagement;
    } catch (error) {
      logger.error('Update engagement error:', error);
      throw error;
    }
  }

  /**
   * Add user to engagement team
   * Uses EngagementUser model directly to ensure database is updated
   */
  async addUserToEngagement(engagementId, userIdToAdd, role = 'associate', addedBy) {
    try {
      // Get engagement
      const engagement = await Engagement.findByPk(engagementId);

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      // Get firm_id from engagement's audit client
      const auditClient = await AuditClient.findByPk(engagement.audit_client_id);
      if (!auditClient) {
        throw new Error('Audit client not found for engagement');
      }
      const firmId = auditClient.firm_id;

      // Check if adding user has access (if not system operation)
      // Only allow engagement_partner or engagement_manager to add users
      if (addedBy && addedBy !== userIdToAdd) {
        const hasAccess = await this.checkUserAccess(engagementId, addedBy);
        
        if (!hasAccess) {
          throw new Error('Access denied to this engagement');
        }

        // Additional check: verify user has partner or manager role
        const currentUserMember = await EngagementUser.findOne({
          where: {
            engagement_id: engagementId,
            user_id: addedBy
          }
        });

        if (currentUserMember && 
            currentUserMember.role !== 'engagement_partner' && 
            currentUserMember.role !== 'engagement_manager') {
          throw new Error('Only engagement partners and managers can add users');
        }
      }

      // Verify user to add exists and belongs to same firm
      const userToAdd = await User.findByPk(userIdToAdd);
      
      if (!userToAdd) {
        throw new Error('User to add not found');
      }

      if (userToAdd.firm_id !== firmId) {
        throw new Error('User does not belong to the same firm');
      }

      // Check if user is already in engagement
      const existingMember = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: userIdToAdd
        }
      });
      
      let engagementUser;
      if (existingMember) {
        // User already exists - update main to true, keep confirmation_tool and sampling_tool as they are
        if (existingMember.main === false) {
          await existingMember.update({ main: true });
        }
        // Also update role if it's different
        if (role && existingMember.role !== role) {
          await existingMember.update({ role: role });
        }
        engagementUser = existingMember;
      } else {
        // User doesn't exist - create new row with main=true, confirmation_tool=false, sampling_tool=false, independence_tool=false
        engagementUser = await EngagementUser.create({
          engagement_id: engagementId,
          user_id: userIdToAdd,
          role: role,
          main: true, // Set main to true when adding user via access and roles
          confirmation_tool: false, // Set to false only when creating new row
          sampling_tool: false, // Set to false only when creating new row
          independence_tool: false // Set to false only when creating new row
        });
      }

      // Log user addition
      if (addedBy) {
        await authService.logAuditEvent(
          addedBy,
          firmId,
          'ADD_USER_TO_ENGAGEMENT',
          'ENGAGEMENT',
          engagement.id,
          { user_id: userIdToAdd, role },
          null,
          null,
          'SUCCESS'
        );
      }

      return engagementUser;
    } catch (error) {
      logger.error('Add user to engagement error:', error);
      throw error;
    }
  }

  /**
   * Remove user from engagement team
   * Uses EngagementUser model directly to ensure database is updated
   */
  async removeUserFromEngagement(engagementId, userIdToRemove, removedBy) {
    try {
      // Get engagement
      const engagement = await Engagement.findByPk(engagementId);

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      // Get firm_id from engagement's audit client
      const auditClient = await AuditClient.findByPk(engagement.audit_client_id);
      if (!auditClient) {
        throw new Error('Audit client not found for engagement');
      }
      const firmId = auditClient.firm_id;

      // Check if removing user has access
      // Only allow engagement_partner or engagement_manager to remove users
      const hasAccess = await this.checkUserAccess(engagementId, removedBy);
      
      if (!hasAccess) {
        throw new Error('Access denied to this engagement');
      }

      // Additional check: verify user has partner or manager role
      const currentUserMember = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: removedBy
        }
      });

      if (currentUserMember && 
          currentUserMember.role !== 'engagement_partner' && 
          currentUserMember.role !== 'engagement_manager') {
        throw new Error('Only engagement partners and managers can remove users');
      }

      // Verify user to remove exists
      const userToRemove = await User.findByPk(userIdToRemove);
      
      if (!userToRemove) {
        throw new Error('User to remove not found');
      }

      // Check if user is in engagement
      const engagementUser = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: userIdToRemove
        }
      });

      if (!engagementUser) {
        throw new Error('User is not a member of this engagement');
      }

      // Remove user from engagement by deleting EngagementUser record directly from database
      await EngagementUser.destroy({
        where: {
          engagement_id: engagementId,
          user_id: userIdToRemove
        }
      });

      // Log user removal
      await authService.logAuditEvent(
        removedBy,
        firmId,
        'REMOVE_USER_FROM_ENGAGEMENT',
        'ENGAGEMENT',
        engagement.id,
        { user_id: userIdToRemove },
        null,
        null,
        'SUCCESS'
      );

      return true;
    } catch (error) {
      logger.error('Remove user from engagement error:', error);
      throw error;
    }
  }

  /**
   * Get engagement team members
   */
  async getEngagementTeam(engagementId, userId) {
    try {
      // Check if user has access
      const hasAccess = await this.checkUserAccess(engagementId, userId);
      
      if (!hasAccess) {
        throw new Error('Access denied to this engagement');
      }

      const engagement = await Engagement.findByPk(engagementId, {
        include: [
          {
            model: User,
            as: 'teamMembers',
            attributes: ['id', 'user_name', 'email', 'type'],
            through: { 
              attributes: ['role']
            }
          }
        ]
      });

      if (!engagement) {
        throw new Error('Engagement not found');
      }

      // Format the response to include role from the through table
      // Sequelize stores through table data as member.EngagementUser
      const teamMembers = engagement.teamMembers.map(member => {
        return {
          id: member.id,
          user_name: member.user_name,
          email: member.email,
          type: member.type,
          role: member.EngagementUser ? member.EngagementUser.role : null
        };
      });

      return teamMembers;
    } catch (error) {
      logger.error('Get engagement team error:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to engagement
   */
  async checkUserAccess(engagementId, userId) {
    try {
      const engagement = await Engagement.findByPk(engagementId, {
        include: [
          {
            association: 'teamMembers',
            where: { id: userId },
            required: false
          }
        ]
      });

      if (!engagement) {
        return false;
      }

      // User has access if they are a team member
      return engagement.teamMembers && engagement.teamMembers.length > 0;
    } catch (error) {
      logger.error('Check user access error:', error);
      return false;
    }
  }

  /**
   * Get users with confirmation tool access for engagement's firm
   * Returns users from the same firm who have "confirmation" in their allowed_tools
   */
  async getUsersAvailableForConfirmation(engagementId) {
    try {
      const { Op } = require('sequelize');
      const { sequelize } = require('../config/database');

      logger.info(`Getting users available for confirmation for engagement ${engagementId}`);

      // Get firm_id from engagement using direct SQL query to avoid association issues
      const firmQuery = `
        SELECT ac.firm_id
        FROM engagements e
        INNER JOIN audit_clients ac ON e.audit_client_id = ac.id
        WHERE e.id = :engagementId
      `;

      const [firmResult] = await sequelize.query(firmQuery, {
        replacements: { engagementId },
        type: sequelize.QueryTypes.SELECT
      });

      if (!firmResult || !firmResult.firm_id) {
        logger.error(`Engagement ${engagementId} not found or does not have associated audit client`);
        throw new Error('Engagement not found or does not have associated audit client');
      }

      const firmId = firmResult.firm_id;
      logger.info(`Found firm_id ${firmId} for engagement ${engagementId}`);

      // Query users from the same firm who have "confirmation" in allowed_tools
      // Note: designation is not stored in users table - it comes from UI/people_data.json
      const query = `
        SELECT 
          u.id,
          u.user_name,
          u.email,
          u.type,
          u.is_active,
          u.allowed_tools
        FROM users u
        WHERE u.firm_id = :firmId
          AND u.is_active = true
          AND u.allowed_tools IS NOT NULL
          AND u.allowed_tools::jsonb @> '["confirmation"]'::jsonb
        ORDER BY u.user_name ASC
      `;

      logger.info(`Executing query for firm_id ${firmId}`);
      const users = await sequelize.query(query, {
        replacements: { firmId },
        type: sequelize.QueryTypes.SELECT
      });

      logger.info(`Found ${users.length} users with confirmation tool access for firm ${firmId}`);
      if (users.length > 0) {
        logger.info(`Users: ${users.map(u => `${u.user_name} (${u.email})`).join(', ')}`);
      }

      return users;
    } catch (error) {
      logger.error('Get users available for confirmation error:', error);
      throw error;
    }
  }

  /**
   * Update engagement user (e.g., set confirmation_tool, sampling_tool, or independence_tool)
   */
  async updateEngagementUser(engagementId, userId, updateData) {
    try {
      // Find the engagement user record
      const engagementUser = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: userId
        }
      });

      if (!engagementUser) {
        throw new Error('User is not a member of this engagement');
      }

      // Only allow updating confirmation_tool, sampling_tool, and independence_tool
      const allowedFields = ['confirmation_tool', 'sampling_tool', 'independence_tool'];
      const updates = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Update the engagement user
      await engagementUser.update(updates);

      return engagementUser;
    } catch (error) {
      logger.error('Update engagement user error:', error);
      throw error;
    }
  }

  /**
   * Grant confirmation tool access to engagement partner and manager
   * Sets confirmation_tool = true for engagement_partner and engagement_manager of the engagement
   * @param {string} engagementId - Engagement ID
   * @param {string} userId - User ID requesting the access (must have main access to this engagement)
   */
  async grantConfirmationToolAccess(engagementId, userId) {
    try {
      // Verify user has access to this engagement with main = true
      const userAccess = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: userId,
          main: true
        }
      });

      if (!userAccess) {
        throw new Error('User does not have main access to this engagement');
      }

      // Find engagement partner and manager
      const partner = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          role: 'engagement_partner'
        }
      });

      const manager = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          role: 'engagement_manager'
        }
      });

      const updated = [];

      // Update partner's confirmation_tool access
      if (partner) {
        await partner.update({ confirmation_tool: true });
        updated.push({ user_id: partner.user_id, role: 'engagement_partner' });
        logger.info(`Granted confirmation_tool access to engagement_partner ${partner.user_id} for engagement ${engagementId}`);
      }

      // Update manager's confirmation_tool access
      if (manager) {
        await manager.update({ confirmation_tool: true });
        updated.push({ user_id: manager.user_id, role: 'engagement_manager' });
        logger.info(`Granted confirmation_tool access to engagement_manager ${manager.user_id} for engagement ${engagementId}`);
      }

      if (updated.length === 0) {
        throw new Error('No engagement partner or manager found for this engagement');
      }

      return {
        engagement_id: engagementId,
        updated_users: updated
      };
    } catch (error) {
      logger.error('Grant confirmation tool access error:', error);
      throw error;
    }
  }

  /**
   * Get engagements for independence tool
   * Returns engagements where user is engagement_partner or engagement_manager
   * @param {string} userId - User ID
   */
  async getEngagementsForIndependenceTool(userId) {
    try {
      const { Op } = require('sequelize');
      
      logger.info(`[getEngagementsForIndependenceTool] Getting engagements for user ${userId}`);

      // Find engagement IDs where user is engagement_partner or engagement_manager
      const engagementUsers = await EngagementUser.findAll({
        where: {
          user_id: userId,
          role: {
            [Op.in]: ['engagement_partner', 'engagement_manager']
          }
        },
        attributes: ['engagement_id', 'role'],
        raw: true
      });

      const engagementIds = engagementUsers.map(eu => eu.engagement_id);
      logger.info(`[getEngagementsForIndependenceTool] Found ${engagementIds.length} engagement_user records where user is partner/manager`);
      logger.info(`[getEngagementsForIndependenceTool] Engagement IDs: ${JSON.stringify(engagementIds)}`);

      if (engagementIds.length === 0) {
        logger.info(`[getEngagementsForIndependenceTool] No engagements found for user ${userId} with partner/manager role`);
        return [];
      }

      // Get the full engagement data
      // Remove is_default filter and make client status optional to show all engagements
      const engagements = await Engagement.findAll({
        where: {
          id: { [Op.in]: engagementIds },
          is_default: false
        },
        include: [
          {
            model: AuditClient,
            as: 'auditClient',
            required: false, // Make optional to include engagements even if client is not Active
            attributes: ['id', 'client_name', 'status', 'firm_id']
          },
          {
            model: User,
            as: 'teamMembers',
            through: {
              where: { independence_tool: true }, // Only show team members with independence_tool = true
              attributes: ['role', 'confirmation_tool', 'sampling_tool', 'independence_tool', 'main']
            },
            attributes: ['id', 'user_name', 'email', 'type'],
            required: false // Make optional so engagement still shows even if no team members have independence_tool = true
          }
        ],
        attributes: ['id', 'audit_client_id', 'status', 'is_default', 'engagement_name', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']]
      });

      logger.info(`[getEngagementsForIndependenceTool] Retrieved ${engagements.length} engagements from database`);

      // Format the response
      const formattedEngagements = engagements.map(engagement => {
        const engagementData = engagement.toJSON();
        const formattedTeamMembers = (engagementData.teamMembers || []).map(member => {
          const engagementUser = member.EngagementUser || {};
          return {
            id: member.id,
            user_name: member.user_name,
            email: member.email,
            type: member.type,
            role: engagementUser.role || null,
            main: engagementUser.main !== undefined ? engagementUser.main : null,
            confirmation_tool: engagementUser.confirmation_tool !== undefined ? engagementUser.confirmation_tool : null,
            sampling_tool: engagementUser.sampling_tool !== undefined ? engagementUser.sampling_tool : null,
            independence_tool: engagementUser.independence_tool !== undefined ? engagementUser.independence_tool : null
          };
        });

        return {
          id: engagementData.id,
          audit_client_id: engagementData.audit_client_id,
          status: engagementData.status,
          is_default: engagementData.is_default,
          engagement_name: engagementData.engagement_name,
          client_name: engagementData.auditClient?.client_name,
          teamMembers: formattedTeamMembers,
          created_at: engagementData.created_at,
          updated_at: engagementData.updated_at
        };
      });

      logger.info(`[getEngagementsForIndependenceTool] Returning ${formattedEngagements.length} engagements`);
      return formattedEngagements;
    } catch (error) {
      logger.error('Get engagements for independence tool error:', error);
      throw error;
    }
  }

  /**
   * Get users for an engagement where main=true
   * Returns users from engagement_users table where main=true for the given engagement
   * @param {string} engagementId - Engagement ID
   * @param {string} userId - User ID requesting (must have access to engagement)
   */
  async getUsersWithMainAccess(engagementId, userId) {
    try {
      const { Op } = require('sequelize');
      
      // Check if user has access to engagement
      await this.getEngagement(engagementId, userId);

      // Get users from engagement_users where main=true
      const engagementUsers = await EngagementUser.findAll({
        where: {
          engagement_id: engagementId,
          main: true
        }
      });

      // Get user details for each engagement user
      const userIds = engagementUsers.map(eu => eu.user_id);
      const users = await User.findAll({
        where: {
          id: { [Op.in]: userIds }
        },
        attributes: ['id', 'user_name', 'email', 'type']
      });

      // Create a map for quick lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      // Format the response
      const formattedUsers = engagementUsers.map(eu => {
        const user = userMap[eu.user_id];
        if (!user) return null;
        
        return {
          id: user.id,
          user_name: user.user_name,
          email: user.email,
          type: user.type,
          role: eu.role,
          main: eu.main,
          independence_tool: eu.independence_tool
        };
      }).filter(u => u !== null);

      logger.info(`[getUsersWithMainAccess] Found ${formattedUsers.length} users with main=true for engagement ${engagementId}`);
      return formattedUsers;
    } catch (error) {
      logger.error('Get users with main access error:', error);
      throw error;
    }
  }

  /**
   * Add user to engagement for independence tool
   * Sets independence_tool=true when adding user
   * @param {string} engagementId - Engagement ID
   * @param {string} userIdToAdd - User ID to add
   * @param {string} addedBy - User ID adding the user
   */
  async addUserToEngagementForIndependenceTool(engagementId, userIdToAdd, addedBy) {
    try {
      // Verify user adding has access and is partner/manager
      const hasAccess = await this.checkUserAccess(engagementId, addedBy);
      if (!hasAccess) {
        throw new Error('Access denied to this engagement');
      }

      // Check if adding user is engagement_partner or engagement_manager
      const currentUserMember = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: addedBy
        }
      });

      if (!currentUserMember || 
          (currentUserMember.role !== 'engagement_partner' && currentUserMember.role !== 'engagement_manager')) {
        throw new Error('Only engagement partners and managers can add users');
      }

      // Check if user to add has main=true in engagement_users
      const userToAddMember = await EngagementUser.findOne({
        where: {
          engagement_id: engagementId,
          user_id: userIdToAdd,
          main: true
        }
      });

      if (!userToAddMember) {
        throw new Error('User must have main access to this engagement before adding to independence tool');
      }

      // Update independence_tool to true
      await userToAddMember.update({ independence_tool: true });

      logger.info(`[addUserToEngagementForIndependenceTool] Set independence_tool=true for user ${userIdToAdd} in engagement ${engagementId}`);

      return userToAddMember;
    } catch (error) {
      logger.error('Add user to engagement for independence tool error:', error);
      throw error;
    }
  }
}

module.exports = new EngagementService();

