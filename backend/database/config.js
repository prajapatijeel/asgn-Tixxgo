const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  development: {
    username: process.env.DB_USER || 'tixxgo_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tixxgo_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    dialect: 'mysql',
  },
  test: {
    username: process.env.DB_USER || 'tixxgo_user',
    password: process.env.DB_PASSWORD || '',
    database: `${process.env.DB_NAME || 'tixxgo_db'}_test`,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    dialect: 'mysql',
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3307', 10),
    dialect: 'mysql',
  },
};
