'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Packages', {
            id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            name: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.TEXT, allowNull: false },
            included: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
            imageUrl: { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
            createdAt: { allowNull: false, type: Sequelize.DATE },
            updatedAt: { allowNull: false, type: Sequelize.DATE }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Packages');
    }
};
