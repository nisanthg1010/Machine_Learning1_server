/**
 * ML Routes
 * API endpoints that proxy to ML microservice
 */

const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');

// @route   GET /api/ml/algorithms
// @desc    Get available algorithms
// @access  Public
router.get('/algorithms', mlController.getAlgorithms);

// @route   POST /api/ml/preprocess
// @desc    Preprocess data
// @access  Public
router.post('/preprocess', mlController.preprocessData);

// @route   POST /api/ml/train
// @desc    Train a model
// @access  Public
router.post('/train', mlController.trainModel);

// @route   POST /api/ml/evaluate
// @desc    Evaluate model
// @access  Public
router.post('/evaluate', mlController.evaluateModel);

// @route   POST /api/ml/tune
// @desc    Tune hyperparameters
// @access  Public
router.post('/tune', mlController.tuneHyperparameters);

module.exports = router;
