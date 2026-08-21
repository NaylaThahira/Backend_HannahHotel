const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create a Sequelize instance using environment variables
// It assumes a POSTGRES_URL or standard POSTGRES variables are present in .env
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'hannah_hotel',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'password',
  {
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection };
