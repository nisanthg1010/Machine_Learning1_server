/**
 * Experiment Routes
 * API endpoints for ML experiments
 */

const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experimentController');
const modelComparisonController = require('../controllers/modelComparison');

// @route   POST /api/experiments/create
// @desc    Create a new experiment
// @access  Public
router.post('/create', experimentController.createExperiment);

// @route   POST /api/experiments/train-multiple
// @desc    Train multiple models and compare
// @access  Public
router.post('/train-multiple', modelComparisonController.trainMultipleModels);

// @route   POST /api/experiments/compare
// @desc    Compare multiple experiments
// @access  Public
router.post('/compare', (req, res) => {
    // This will be implemented by model comparison controller
    res.status(200).json({ message: 'Comparison endpoint' });
});

// @route   GET /api/experiments
// @desc    Get all experiments
// @access  Public
router.get('/', experimentController.getExperiments);

// @route   GET /api/experiments/:id
// @desc    Get experiment by ID
// @access  Public
router.get('/:id', experimentController.getExperimentById);

// @route   POST /api/experiments/:id/train
// @desc    Train model for experiment
// @access  Public
router.post('/:id/train', experimentController.trainModel);

// @route   POST /api/experiments/:id/tune
// @desc    Perform hyperparameter tuning
// @access  Public
router.post('/:id/tune', experimentController.tuneHyperparameters);

// @route   DELETE /api/experiments/:id
// @desc    Delete experiment
// @access  Public
router.delete('/:id', experimentController.deleteExperiment);

module.exports = router;
