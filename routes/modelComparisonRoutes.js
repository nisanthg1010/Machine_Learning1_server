/**
 * Model Comparison Routes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    compareModels,
    getMetricsReference,
    getHyperparameters
} = require('../controllers/modelComparisonController');

// @route   POST /api/model-comparison/compare-models
// @desc    Train and compare multiple models
// @access  Private
router.post('/compare-models', protect, compareModels);

// @route   GET /api/model-comparison/metrics-reference
// @desc    Get metrics reference with formulas
// @access  Public
router.get('/metrics-reference', getMetricsReference);

// @route   GET /api/model-comparison/hyperparameters/:algorithm
// @desc    Get hyperparameters for specific algorithm
// @access  Public
router.get('/hyperparameters/:algorithm', getHyperparameters);

module.exports = router;
