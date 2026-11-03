'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Package extends Model { }

    Package.init({
        name: DataTypes.STRING,
        location: DataTypes.STRING,
        description: DataTypes.TEXT,
        included: DataTypes.JSON,
        imageUrl: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'Package',
    });

    return Package;
};
