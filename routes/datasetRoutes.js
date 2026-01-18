/**
 * Dataset Routes
 * API endpoints for dataset management
 */

const express = require('express');
const router = express.Router();
const datasetController = require('../controllers/datasetController');
const upload = require('../middleware/upload');

// @route   POST /api/datasets/upload
// @desc    Upload a new dataset
// @access  Public
router.post('/upload', upload.single('file'), datasetController.uploadDataset);

// @route   GET /api/datasets
// @desc    Get all datasets
// @access  Public
router.get('/', datasetController.getDatasets);

// @route   GET /api/datasets/:id
// @desc    Get dataset by ID
// @access  Public
router.get('/:id', datasetController.getDatasetById);

// @route   PUT /api/datasets/:id
// @desc    Update dataset
// @access  Public
router.put('/:id', datasetController.updateDataset);

// @route   DELETE /api/datasets/:id
// @desc    Delete dataset
// @access  Public
router.delete('/:id', datasetController.deleteDataset);

// @route   POST /api/datasets/:id/preprocess
// @desc    Preprocess dataset
// @access  Public
router.post('/:id/preprocess', datasetController.preprocessDataset);

module.exports = router;
