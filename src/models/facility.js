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
        location: DataTypes.STRING,
    description: DataTypes.TEXT,
    icon: DataTypes.STRING,
    price: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    facilities: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Facility',
  });
  return Facility;
};
