'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('Rooms');
        if (!tableInfo.detailImageUrls) {
            await queryInterface.addColumn('Rooms', 'detailImageUrls', {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            });
        }
    },

    async down(queryInterface) {
        const tableInfo = await queryInterface.describeTable('Rooms');
        if (tableInfo.detailImageUrls) {
            await queryInterface.removeColumn('Rooms', 'detailImageUrls');
        }
    }
};
