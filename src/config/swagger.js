const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API documentation',
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [
      { name: 'System', description: 'Health and ops' },
      { name: 'OTP', description: 'OTP proxy' },
      { name: 'SSO', description: 'SSO URL generation' },
      { name: 'Users', description: 'User CRUD' },
    ],
  },
  apis: [
    path.join(__dirname, '../server.js'),
    path.join(__dirname, '../routes/*.routes.js'),
  ],
};

module.exports = swaggerJsdoc(options);