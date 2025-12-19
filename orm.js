const { Sequelize } = require("sequelize");

let sequelizeInstance;
if (process.env.NODE_ENV !== "production") {
  sequelizeInstance = new Sequelize(process.env.DB_URI);
} else {
  sequelizeInstance = new Sequelize({
    dialect: "mysql",
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    username: process.env.DB_DEV_USER,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_NAME,
  });
}

module.exports = sequelizeInstance;
