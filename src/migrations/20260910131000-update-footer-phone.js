'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkUpdate(
            'Settings',
            { value: '0811 6617 717', updatedAt: new Date() },
            { key: 'footer_phone' }
        );
    },

    async down(queryInterface) {
        await queryInterface.bulkUpdate(
            'Settings',
            { value: '0811 661 7717', updatedAt: new Date() },
            { key: 'footer_phone' }
        );
    }
};
