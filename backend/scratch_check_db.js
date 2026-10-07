const dbConfig = require('./database/config.js');
const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: console.log,
});

sequelize.query("SHOW TABLES;")
  .then(tables => {
    console.log("TABLES:", tables);
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
  });
