const express = require('express');
const router = express.Router();
const db = require('../models');

// GET all facilities
router.get('/', async (req, res) => {
  try {
    const facilities = await db.Facility.findAll({
      order: [['id', 'ASC']]
    });
    res.json(facilities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET single facility
router.get('/:id', async (req, res) => {
  try {
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    res.json(facility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

// POST new facility
router.post('/', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    const newFacility = await db.Facility.create({
      name,
      description,
      icon
    });

    res.status(201).json(newFacility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// PUT update facility
router.put('/:id', async (req, res) => {
  try {
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });

    const { name, description, icon } = req.body;
    
    await facility.update({
      name,
      description,
      icon
    });

    res.json(facility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// DELETE facility
router.delete('/:id', async (req, res) => {
  try {
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });

    await facility.destroy();
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

module.exports = router;
