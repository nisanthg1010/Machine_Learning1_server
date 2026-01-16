/**
 * Experiment Routes
 * API endpoints for ML experiments
 */

const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experimentController');
const modelComparisonController = require('../controllers/modelComparison');
const { protect } = require('../middleware/auth');

// @route   POST /api/experiments/create
// @desc    Create a new experiment
// @access  Private
router.post('/create', protect, experimentController.createExperiment);

// @route   POST /api/experiments/train-multiple
// @desc    Train multiple models and compare
// @access  Private
router.post('/train-multiple', protect, modelComparisonController.trainMultipleModels);

// @route   POST /api/experiments/compare
// @desc    Compare multiple experiments
// @access  Private
router.post('/compare', protect, (req, res) => {
    // This will be implemented by model comparison controller
    res.status(200).json({ message: 'Comparison endpoint' });
});

// @route   GET /api/experiments
// @desc    Get all experiments for logged-in user
// @access  Private
router.get('/', protect, experimentController.getExperiments);

// @route   GET /api/experiments/:id
// @desc    Get experiment by ID
// @access  Private
router.get('/:id', protect, experimentController.getExperimentById);

// @route   POST /api/experiments/:id/train
// @desc    Train model for experiment
// @access  Private
router.post('/:id/train', protect, experimentController.trainModel);

// @route   POST /api/experiments/:id/tune
// @desc    Perform hyperparameter tuning
// @access  Private
router.post('/:id/tune', protect, experimentController.tuneHyperparameters);

// @route   DELETE /api/experiments/:id
// @desc    Delete experiment
// @access  Private
router.delete('/:id', protect, experimentController.deleteExperiment);

module.exports = router;
