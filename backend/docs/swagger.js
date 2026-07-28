const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Invoice Billing System API',
    version: '1.0.0',
    description: 'A comprehensive invoice billing system with user management, invoice creation, and payment processing',
    contact: {
      name: 'API Support',
      email: 'support@invoiceapp.com'
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Development server',
    },
    {
      url: 'https://api.invoiceapp.com/api',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'User ID'
          },
          name: {
            type: 'string',
            description: 'User full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            description: 'User role'
          },
          isActive: {
            type: 'boolean',
            description: 'User active status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation date'
          }
        }
      },
      Invoice: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Invoice ID'
          },
          invoiceNumber: {
            type: 'string',
            description: 'Unique invoice number'
          },
          client: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Client name'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'Client email'
              },
              address: {
                type: 'string',
                description: 'Client address'
              }
            }
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Item description'
                },
                quantity: {
                  type: 'number',
                  description: 'Item quantity'
                },
                rate: {
                  type: 'number',
                  description: 'Item rate per unit'
                },
                amount: {
                  type: 'number',
                  description: 'Total amount for item'
                }
              }
            }
          },
          total: {
            type: 'number',
            description: 'Invoice total amount'
          },
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'paid', 'overdue'],
            description: 'Invoice status'
          },
          dueDate: {
            type: 'string',
            format: 'date',
            description: 'Invoice due date'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Validation errors'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'User password'
          }
        }
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: {
            type: 'string',
            description: 'User full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'User password'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            default: 'user',
            description: 'User role'
          }
        }
      }
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
