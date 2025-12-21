const { Sequelize } = require("sequelize");

let sequelizeInstance;
sequelizeInstance = new Sequelize(process.env.DB_URI);

module.exports = sequelizeInstance;
