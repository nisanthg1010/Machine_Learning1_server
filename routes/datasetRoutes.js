/**
 * Dataset Routes
 * API endpoints for dataset management
 */

const express = require('express');
const router = express.Router();
const datasetController = require('../controllers/datasetController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/datasets/upload
// @desc    Upload a new dataset
// @access  Private
router.post('/upload', protect, upload.single('file'), datasetController.uploadDataset);

// @route   GET /api/datasets
// @desc    Get all datasets for logged-in user
// @access  Private
router.get('/', protect, datasetController.getDatasets);

// @route   GET /api/datasets/:id
// @desc    Get dataset by ID
// @access  Private
router.get('/:id', protect, datasetController.getDatasetById);

// @route   PUT /api/datasets/:id
// @desc    Update dataset
// @access  Private
router.put('/:id', protect, datasetController.updateDataset);

// @route   DELETE /api/datasets/:id
// @desc    Delete dataset
// @access  Private
router.delete('/:id', protect, datasetController.deleteDataset);

// @route   POST /api/datasets/:id/preprocess
// @desc    Preprocess dataset
// @access  Private
router.post('/:id/preprocess', protect, datasetController.preprocessDataset);

module.exports = router;
