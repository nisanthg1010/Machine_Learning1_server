/**
 * ML Routes
 * API endpoints that proxy to ML microservice
 */

const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { protect } = require('../middleware/auth');

// @route   GET /api/ml/algorithms
// @desc    Get available algorithms
// @access  Private
router.get('/algorithms', protect, mlController.getAlgorithms);

// @route   POST /api/ml/preprocess
// @desc    Preprocess data
// @access  Private
router.post('/preprocess', protect, mlController.preprocessData);

// @route   POST /api/ml/train
// @desc    Train a model
// @access  Private
router.post('/train', protect, mlController.trainModel);

// @route   POST /api/ml/evaluate
// @desc    Evaluate model
// @access  Private
router.post('/evaluate', protect, mlController.evaluateModel);

// @route   POST /api/ml/tune
// @desc    Tune hyperparameters
// @access  Private
router.post('/tune', protect, mlController.tuneHyperparameters);

module.exports = router;
