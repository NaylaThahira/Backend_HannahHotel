'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Facility extends Model {
    static associate(models) {
      // define association here
    }
  }
  Facility.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    icon: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Facility',
  });
  return Facility;
};
