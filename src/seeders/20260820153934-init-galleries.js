'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Galleries', [
      {
        title: 'Elegant hotel room',
        imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Indoor swimming pool',
        imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Halal restaurant dining area',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Modern fitness center',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Hotel exterior architecture',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Pantai Carocok scenic view',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Galleries', null, {});
  }
};
