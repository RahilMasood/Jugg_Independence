const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');
const { authenticate, requireUserType } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validation');
const { 
  createEngagementSchema, 
  updateEngagementSchema, 
  addUserToEngagementSchema,
  uuidParamSchema,
  paginationSchema 
} = require('../validators/schemas');

// All engagement routes require authentication
router.use(authenticate);

// List engagements - accessible to all authenticated users
// Returns engagements where the user is a team member
router.get('/', validate(paginationSchema), engagementController.listEngagements.bind(engagementController));

// Get engagements for "Grant Confirmation Tool Access" dialog
// Returns engagements where user has main=true AND confirmation_tool=false
// This endpoint is not affected by JWT application_type
router.get('/for-confirmation-tool-access', engagementController.getEngagementsForConfirmationToolAccess.bind(engagementController));

// Get engagements for independence tool
// Returns engagements where user is engagement_partner or engagement_manager
router.get('/for-independence-tool', engagementController.getEngagementsForIndependenceTool.bind(engagementController));

// Get specific engagement
router.get('/:id', validate(uuidParamSchema), engagementController.getEngagement.bind(engagementController));

// Create engagement (policy check done in service)
router.post('/', validate(createEngagementSchema), engagementController.createEngagement.bind(engagementController));

// Update engagement
router.patch('/:id', validate(updateEngagementSchema), engagementController.updateEngagement.bind(engagementController));

// Get engagement team
router.get('/:id/users', validate(uuidParamSchema), engagementController.getEngagementTeam.bind(engagementController));

// Get users available for confirmation tool (users with confirmation in allowed_tools)
router.get('/:id/users/available-for-confirmation', validate(uuidParamSchema), engagementController.getUsersAvailableForConfirmation.bind(engagementController));

// Get users with main access for an engagement (for independence tool)
router.get('/:id/users/main-access', validate(uuidParamSchema), engagementController.getUsersWithMainAccess.bind(engagementController));

// Add user to engagement
router.post('/:id/users', validate(addUserToEngagementSchema), engagementController.addUser.bind(engagementController));

// Remove user from engagement
router.delete('/:id/users/:userId', engagementController.removeUser.bind(engagementController));

// Update engagement user (e.g., set confirmation_tool, sampling_tool, or independence_tool)
router.patch('/:id/users/:userId', engagementController.updateEngagementUser.bind(engagementController));

// Add user to independence tool (sets independence_tool=true)
router.post('/:id/users/:userId/independence-tool', engagementController.addUserToIndependenceTool.bind(engagementController));

// Grant confirmation tool access to engagement partner and manager
router.post('/:id/grant-confirmation-access', validate(uuidParamSchema), engagementController.grantConfirmationToolAccess.bind(engagementController));

// Confirmation routes for specific engagement
const confirmationController = require('../controllers/confirmationController');
const { createConfirmationSchema } = require('../validators/schemas');

// List confirmations for engagement
router.get('/:id/confirmations', confirmationController.listEngagementConfirmations.bind(confirmationController));

// Create confirmation for engagement
router.post('/:id/confirmations', 
  validate(createConfirmationSchema),
  confirmationController.createConfirmation.bind(confirmationController)
);

module.exports = router;

