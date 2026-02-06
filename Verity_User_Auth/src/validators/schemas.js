const Joi = require('joi');

// Password validation pattern
const passwordPattern = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

// Login schema
const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    application_type: Joi.string().valid('main', 'confirmation', 'sampling', 'clientonboard', 'Jugg_Confirmation', 'Independence_Tool').optional()
  })
};

// Register/Create user schema
const createUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    user_type: Joi.string().valid('AUDITOR', 'CLIENT', 'CONFIRMING_PARTY').required(),
    firm_id: Joi.string().uuid().required(),
    designation: Joi.string().optional(),
    payroll_id: Joi.string().optional()
  })
};

// Update user schema
const updateUserSchema = {
  params: Joi.object({
    id: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().pattern(/^\d+$/).min(4).max(10) // Numeric IDs: 4-10 digits
    ).required().messages({
      'alternatives.match': 'params.id must be a valid UUID or numeric ID'
    })
  }),
  body: Joi.object({
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    designation: Joi.string().optional(),
    is_active: Joi.boolean().optional()
  })
};

// Change password schema
const changePasswordSchema = {
  body: Joi.object({
    old_password: Joi.string().required(),
    new_password: passwordPattern.required()
  })
};

// Reset password schema
const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    new_password: passwordPattern.required()
  })
};

// Create engagement schema
const createEngagementSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    client_name: Joi.string().required(),
    description: Joi.string().optional(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
    status: Joi.string().valid('ACTIVE', 'COMPLETED', 'ARCHIVED').default('ACTIVE')
  })
};

// Update engagement schema
const updateEngagementSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    client_name: Joi.string().optional(),
    description: Joi.string().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    status: Joi.string().valid('ACTIVE', 'COMPLETED', 'ARCHIVED').optional()
  })
};

// Add user to engagement schema
const addUserToEngagementSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    user_id: Joi.string().uuid().required(),
    role: Joi.string().valid(
      'engagement_partner',
      'eqr_partner',
      'engagement_manager',
      'eqr_manager',
      'associate',
      'article'
    ).default('associate')
  })
};

// Create confirmation request schema
const createConfirmationSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    party_type: Joi.string().valid('CLIENT', 'CONFIRMING_PARTY').required(),
    party_email: Joi.string().email().required(),
    party_name: Joi.string().required(),
    confirmation_type: Joi.string().required(),
    description: Joi.string().optional(),
    due_date: Joi.date().iso().optional()
  })
};

// Update confirmation request schema
const updateConfirmationSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    status: Joi.string().valid('PENDING', 'RESPONDED', 'COMPLETED', 'CANCELLED').optional(),
    notes: Joi.string().optional()
  })
};

// Respond to confirmation schema
const respondConfirmationSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    response: Joi.string().required(),
    attachments: Joi.array().items(Joi.string()).optional()
  })
};

// Pagination schema
const paginationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid('ASC', 'DESC').default('ASC')
  })
};

// UUID param schema (for backward compatibility)
const uuidParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
};

// Flexible ID param schema - accepts UUID or numeric string (for new numeric IDs)
const idParamSchema = {
  params: Joi.object({
    id: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().pattern(/^\d+$/).min(4).max(10) // Numeric IDs: 4-10 digits
    ).required().messages({
      'alternatives.match': 'params.id must be a valid UUID or numeric ID'
    })
  })
};

// Create client schema
const createClientSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    industry: Joi.string().optional(),
    contact_person: Joi.string().optional(),
    contact_email: Joi.string().email().optional(),
    contact_phone: Joi.string().optional(),
    address: Joi.string().optional(),
    engagement_partner_id: Joi.string().uuid().required(),
    engagement_manager_id: Joi.string().uuid().required(),
    eqr_partner_id: Joi.string().uuid().optional().allow(null),
    concurrent_review_partner_id: Joi.string().uuid().optional().allow(null),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ARCHIVED').default('ACTIVE'),
    onboarding_date: Joi.date().iso().optional(),
    metadata: Joi.object().optional()
  })
};

// Update client schema
const updateClientSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    industry: Joi.string().optional(),
    contact_person: Joi.string().optional(),
    contact_email: Joi.string().email().optional(),
    contact_phone: Joi.string().optional(),
    address: Joi.string().optional(),
    engagement_partner_id: Joi.string().uuid().optional(),
    engagement_manager_id: Joi.string().uuid().optional(),
    eqr_partner_id: Joi.string().uuid().optional().allow(null),
    concurrent_review_partner_id: Joi.string().uuid().optional().allow(null),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
    metadata: Joi.object().optional()
  })
};

// Add user for independence declaration schema
const addUserForDeclarationSchema = {
  params: Joi.object({
    engagementId: Joi.string().uuid().required()
  }),
  body: Joi.object({
    user_id: Joi.string().uuid().required()
  })
};

// Submit independence declaration schema
const submitDeclarationSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    is_independent: Joi.boolean().required(),
    conflicts_disclosed: Joi.string().optional().allow(null, ''),
    safeguards_applied: Joi.string().optional().allow(null, ''),
    declaration_period_start: Joi.date().iso().required(),
    declaration_period_end: Joi.date().iso().greater(Joi.ref('declaration_period_start')).required()
  })
};

// Review independence declaration schema
const reviewDeclarationSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW').required(),
    reviewer_notes: Joi.string().optional().allow(null, '')
  })
};

// Admin login schema (Page 1)
const adminLoginSchema = {
  body: Joi.object({
    admin_id: Joi.string().required(),
    password: Joi.string().required()
  })
};

// Create user schema for admin (Page 1)
const adminCreateUserSchema = {
  body: Joi.object({
    user_name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: passwordPattern.required(),
    type: Joi.string().valid('partner', 'manager', 'associate', 'article').required(),
    payroll_id: Joi.string().optional().allow(null, ''),
    allowed_tools: Joi.array().items(Joi.string().valid('main', 'confirmation', 'sampling', 'clientonboard', 'Jugg_Confirmation')).optional().allow(null)
  })
};

// Update user schema for admin (Page 1)
const adminUpdateUserSchema = {
  params: Joi.object({
    id: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().pattern(/^\d+$/).min(4).max(10) // Numeric IDs: 4-10 digits
    ).required().messages({
      'alternatives.match': 'params.id must be a valid UUID or numeric ID'
    })
  }),
  body: Joi.object({
    user_name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: passwordPattern.optional(),
    type: Joi.string().valid('partner', 'manager', 'associate', 'article').optional(),
    payroll_id: Joi.string().optional().allow(null, ''),
    allowed_tools: Joi.array().items(Joi.string().valid('main', 'confirmation', 'sampling', 'clientonboard', 'Jugg_Confirmation')).optional().allow(null)
  })
};

// Create audit client schema (Page 2)
const createAuditClientSchema = {
  body: Joi.object({
    client_name: Joi.string().required().trim(),
    engagement_partner_id: Joi.string().uuid().required(),
    engagement_manager_id: Joi.string().uuid().required()
  })
};

// Create engagement schema for admin (Page 3)
const adminCreateEngagementSchema = {
  params: Joi.object({
    clientId: Joi.string().uuid().required()
  }),
  body: Joi.object({
    engagement_name: Joi.string().optional(),
    engagement_partner_id: Joi.string().uuid().optional(),
    engagement_manager_id: Joi.string().uuid().optional()
  })
};

// Add user to engagement schema for admin (Page 3)
const adminAddUserToEngagementSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    user_id: Joi.string().uuid().required(),
    role: Joi.string().valid(
      'engagement_partner',
      'eqr_partner',
      'engagement_manager',
      'eqr_manager',
      'associate',
      'article'
    ).required()
  })
};

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  createEngagementSchema,
  updateEngagementSchema,
  addUserToEngagementSchema,
  createConfirmationSchema,
  updateConfirmationSchema,
  respondConfirmationSchema,
  paginationSchema,
  uuidParamSchema,
  idParamSchema,
  createClientSchema,
  updateClientSchema,
  addUserForDeclarationSchema,
  submitDeclarationSchema,
  reviewDeclarationSchema,
  // New admin schemas
  adminLoginSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  createAuditClientSchema,
  adminCreateEngagementSchema,
  adminAddUserToEngagementSchema
};

