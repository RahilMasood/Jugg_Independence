const engagementService = require('../services/engagementService');

class EngagementController {
  /**
   * Create engagement
   * POST /api/v1/engagements
   */
  async createEngagement(req, res, next) {
    try {
      const engagementData = req.body;
      const createdBy = req.user.id;

      const engagement = await engagementService.createEngagement(engagementData, createdBy);

      res.status(201).json({
        success: true,
        data: { engagement }
      });
    } catch (error) {
      return res.status(error.message.includes('permission') ? 403 : 400).json({
        success: false,
        error: {
          code: error.message.includes('permission') ? 'POLICY_VIOLATION' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Get engagement by ID
   * GET /api/v1/engagements/:id
   */
  async getEngagement(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const engagement = await engagementService.getEngagement(id, userId);

      res.json({
        success: true,
        data: { engagement }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : 404).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : 'NOT_FOUND',
          message: error.message
        }
      });
    }
  }

  /**
   * List engagements
   * GET /api/v1/engagements
   * Query params:
   *   - for_confirmation_tool: boolean - If true, only return engagements where confirmation_tool = true
   *   - status: string - Filter by engagement status
   *   - client_name: string - Filter by client name
   * 
   * Note: If application_type in JWT token is "Jugg_Confirmation", automatically filters by confirmation_tool = true
   */
  async listEngagements(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Check if application_type from JWT token is "Jugg_Confirmation"
      // req.auth contains the decoded JWT token payload which includes application_type
      const applicationType = req.auth?.application_type || req.query.application_type;
      const isConfirmationTool = applicationType === 'Jugg_Confirmation';
      
      // Log for debugging (can be removed in production)
      const logger = require('../utils/logger');
      logger.info(`[listEngagements] User ${userId}, application_type: ${applicationType}, isConfirmationTool: ${isConfirmationTool}`);
      
      // Check if for_main_access is explicitly requested - if so, it takes precedence
      const forMainAccess = req.query.for_main_access === 'true' || req.query.for_main_access === true;
      
      const filters = {
        status: req.query.status,
        client_name: req.query.client_name,
        client_id: req.query.client_id || req.query.audit_client_id,
        // Filter by confirmation_tool if:
        // 1. application_type in JWT is "Jugg_Confirmation", OR
        // 2. for_confirmation_tool query param is 'true'
        // BUT only if for_main_access is NOT explicitly requested (for_main_access takes precedence)
        for_confirmation_tool: !forMainAccess && (isConfirmationTool || req.query.for_confirmation_tool === 'true' || req.query.for_confirmation_tool === true),
        // Filter by main access if for_main_access query param is 'true' (main = true AND confirmation_tool = false)
        for_main_access: forMainAccess,
        // Filter by main if for_main query param is 'true' (main = true, regardless of confirmation_tool)
        for_main: req.query.for_main === 'true' || req.query.for_main === true
      };
      
      logger.info(`[listEngagements] Filter for_confirmation_tool: ${filters.for_confirmation_tool}, for_main_access: ${filters.for_main_access}, for_main: ${filters.for_main}`);

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'DESC'
      };

      const result = await engagementService.listEngagements(userId, filters, pagination);

      res.json({
        success: true,
        data: result.engagements || []
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update engagement
   * PATCH /api/v1/engagements/:id
   */
  async updateEngagement(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.id;

      const engagement = await engagementService.updateEngagement(id, updateData, updatedBy);

      res.json({
        success: true,
        data: { engagement }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Add user to engagement
   * POST /api/v1/engagements/:id/users
   */
  async addUser(req, res, next) {
    try {
      const { id } = req.params;
      const { user_id, role } = req.body;
      const addedBy = req.user.id;

      await engagementService.addUserToEngagement(id, user_id, role, addedBy);

      res.json({
        success: true,
        data: {
          message: 'User added to engagement successfully'
        }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Remove user from engagement
   * DELETE /api/v1/engagements/:id/users/:userId
   */
  async removeUser(req, res, next) {
    try {
      const { id, userId } = req.params;
      const removedBy = req.user.id;

      await engagementService.removeUserFromEngagement(id, userId, removedBy);

      res.json({
        success: true,
        data: {
          message: 'User removed from engagement successfully'
        }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Get engagement team
   * GET /api/v1/engagements/:id/users
   */
  async getEngagementTeam(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const team = await engagementService.getEngagementTeam(id, userId);

      res.json({
        success: true,
        data: { team }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : 404).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : 'NOT_FOUND',
          message: error.message
        }
      });
    }
  }

  /**
   * Get users with confirmation tool access for engagement's firm
   * GET /api/v1/engagements/:id/users/available-for-confirmation
   */
  async getUsersAvailableForConfirmation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user has access to engagement
      await engagementService.getEngagement(id, userId);

      const users = await engagementService.getUsersAvailableForConfirmation(id);

      return res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error in getUsersAvailableForConfirmation controller:', error);
      return res.status(error.message.includes('Access denied') ? 403 : (error.message.includes('not found') ? 404 : 500)).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : (error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
          message: error.message
        }
      });
    }
  }

  /**
   * Update engagement user (e.g., set confirmation_tool, sampling_tool, or independence_tool)
   * PATCH /api/v1/engagements/:id/users/:userId
   */
  async updateEngagementUser(req, res, next) {
    try {
      const { id, userId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.id;

      // Check if user has access to engagement
      await engagementService.getEngagement(id, updatedBy);

      const updated = await engagementService.updateEngagementUser(id, userId, updateData);

      res.json({
        success: true,
        data: { engagementUser: updated }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : error.message.includes('not found') ? 404 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : error.message.includes('not found') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Grant confirmation tool access to engagement partner and manager
   * POST /api/v1/engagements/:id/grant-confirmation-access
   */
  /**
   * Get engagements for "Grant Confirmation Tool Access" dialog
   * GET /api/v1/engagements/for-confirmation-tool-access
   */
  async getEngagementsForConfirmationToolAccess(req, res, next) {
    try {
      const userId = req.user.id;
      const clientId = req.query.client_id || req.query.audit_client_id || null;

      const logger = require('../utils/logger');
      logger.info(`[getEngagementsForConfirmationToolAccess] User ${userId}, client_id: ${clientId}`);

      const engagements = await engagementService.getEngagementsForConfirmationToolAccess(userId, clientId);

      res.json({
        success: true,
        data: engagements
      });
    } catch (error) {
      next(error);
    }
  }

  async grantConfirmationToolAccess(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await engagementService.grantConfirmationToolAccess(id, userId);

      res.json({
        success: true,
        data: {
          message: 'Confirmation tool access granted successfully',
          ...result
        }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') || error.message.includes('does not have') ? 403 : error.message.includes('not found') ? 404 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') || error.message.includes('does not have') ? 'FORBIDDEN' : error.message.includes('not found') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Get engagements for independence tool
   * GET /api/v1/engagements/for-independence-tool
   * Returns engagements where user is engagement_partner or engagement_manager
   */
  async getEngagementsForIndependenceTool(req, res, next) {
    try {
      const userId = req.user.id;

      const engagements = await engagementService.getEngagementsForIndependenceTool(userId);

      res.json({
        success: true,
        data: engagements
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users with main access for an engagement
   * GET /api/v1/engagements/:id/users/main-access
   * Returns users from engagement_users where main=true
   */
  async getUsersWithMainAccess(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const users = await engagementService.getUsersWithMainAccess(id, userId);

      res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') ? 403 : error.message.includes('not found') ? 404 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') ? 'FORBIDDEN' : error.message.includes('not found') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Add user to engagement for independence tool
   * POST /api/v1/engagements/:id/users/:userId/independence-tool
   * Sets independence_tool=true for the user
   */
  async addUserToIndependenceTool(req, res, next) {
    try {
      const { id, userId } = req.params;
      const addedBy = req.user.id;

      await engagementService.addUserToEngagementForIndependenceTool(id, userId, addedBy);

      res.json({
        success: true,
        data: {
          message: 'User added to independence tool successfully'
        }
      });
    } catch (error) {
      return res.status(error.message.includes('Access denied') || error.message.includes('Only engagement') ? 403 : error.message.includes('not found') || error.message.includes('must have main') ? 404 : 400).json({
        success: false,
        error: {
          code: error.message.includes('Access denied') || error.message.includes('Only engagement') ? 'FORBIDDEN' : error.message.includes('not found') || error.message.includes('must have main') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new EngagementController();

