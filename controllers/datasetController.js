/**
 * Dataset Controller
 * Handles dataset operations
 */

const Dataset = require('../models/Dataset');
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');

// @desc    Upload a new dataset
// @route   POST /api/datasets/upload
// @access  Private
exports.uploadDataset = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Please upload a file'
            });
        }

        const { name, description, targetColumn, problemType } = req.body;

        // Parse CSV file
        const results = [];
        const columns = [];

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('headers', (headers) => {
                columns.push(...headers);
            })
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    if (results.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'CSV file is empty'
                        });
                    }

                    // Analyze columns - ensure proper array of objects
                    const columnInfo = [];
                    for (const col of columns) {
                        const colValues = results.map(r => r[col]);
                        columnInfo.push({
                            name: String(col || '').trim(),
                            type: 'string',
                            uniqueValues: Number(new Set(colValues.filter(v => v)).size),
                            missingValues: Number(colValues.filter(v => !v || v === '').length)
                        });
                    }

                    // Limit data size to avoid MongoDB 16MB document cap
                    const jsonSize = Buffer.byteLength(JSON.stringify(results), 'utf8');
                    const MAX_BYTES = 12 * 1024 * 1024; // keep headroom for other fields
                    let dataToPersist = results;
                    if (jsonSize > MAX_BYTES) {
                        const approxRowSize = Math.max(1, Math.floor(jsonSize / results.length));
                        const maxRows = Math.max(100, Math.floor(MAX_BYTES / approxRowSize));
                        dataToPersist = results.slice(0, maxRows);
                    }

                    // Create dataset with explicit field typing and stored file path
                    const dataset = new Dataset({
                        name: String(name || req.file.originalname),
                        description: String(description || ''),
                        user: req.user._id,
                        fileName: String(req.file.originalname),
                        fileSize: Number(req.file.size),
                        filePath: String(req.file.path),
                        columns: columnInfo,
                        numberOfRows: Number(results.length),
                        numberOfColumns: Number(columns.length),
                        targetColumn: String(targetColumn || ''),
                        problemType: String(problemType || ''),
                        data: dataToPersist,
                        status: 'ready'
                    });

                    await dataset.save();

                    // Keep the uploaded file for full-data processing later

                    res.status(201).json({
                        success: true,
                        data: dataset
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get all datasets for user
// @route   GET /api/datasets
// @access  Private
exports.getDatasets = async (req, res) => {
    try {
        const datasets = await Dataset.find({ user: req.user._id })
            .select('-data') // Exclude data field for list view
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: datasets.length,
            data: datasets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get dataset by ID
// @route   GET /api/datasets/:id
// @access  Private
exports.getDatasetById = async (req, res) => {
    try {
        const dataset = await Dataset.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        res.status(200).json({
            success: true,
            data: dataset
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update dataset
// @route   PUT /api/datasets/:id
// @access  Private
exports.updateDataset = async (req, res) => {
    try {
        let dataset = await Dataset.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        dataset = await Dataset.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: dataset
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete dataset
// @route   DELETE /api/datasets/:id
// @access  Private
exports.deleteDataset = async (req, res) => {
    try {
        const dataset = await Dataset.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Cleanup stored file if present
        if (dataset.filePath && fs.existsSync(dataset.filePath)) {
            try { fs.unlinkSync(dataset.filePath); } catch (_) {}
        }

        await dataset.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Preprocess dataset
// @route   POST /api/datasets/:id/preprocess
// @access  Private
exports.preprocessDataset = async (req, res) => {
    try {
        const dataset = await Dataset.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        dataset.status = 'preprocessing';
        await dataset.save();

        // Convert dataset to array format (prefer reading full CSV from file)
        const columns = dataset.columns.map(c => c.name);
        let data;
        if (dataset.filePath && fs.existsSync(dataset.filePath)) {
            data = await new Promise((resolve, reject) => {
                const rows = [];
                fs.createReadStream(dataset.filePath)
                    .pipe(csv())
                    .on('data', (row) => rows.push(row))
                    .on('end', () => resolve(rows.map(r => columns.map(col => r[col]))))
                    .on('error', reject);
            });
        } else {
            data = Array.isArray(dataset.data)
                ? dataset.data.map(row => columns.map(col => row[col]))
                : [];
        }

        // Call ML service for preprocessing
        const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/ml/preprocess`, {
            data: data,
            columns: columns,
            target_column: dataset.targetColumn,
            problem_type: dataset.problemType,
            preprocessing_options: req.body.options || {}
        });

        // Update dataset with preprocessing results
        dataset.preprocessingApplied = true;
        dataset.preprocessingSteps = mlResponse.data.preprocessing_steps;
        dataset.status = 'ready';
        await dataset.save();

        res.status(200).json({
            success: true,
            data: {
                dataset: dataset,
                preprocessing_results: mlResponse.data
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
