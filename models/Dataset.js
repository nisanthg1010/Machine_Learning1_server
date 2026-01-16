/**
 * Dataset Model
 * Schema for storing dataset metadata and information
 */

const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    uniqueValues: { type: Number, default: 0 },
    missingValues: { type: Number, default: 0 }
}, { _id: false });

const datasetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a dataset name'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number
    },
    filePath: {
        type: String
    },
    columns: [columnSchema],
    numberOfRows: {
        type: Number
    },
    numberOfColumns: {
        type: Number
    },
    targetColumn: {
        type: String
    },
    problemType: {
        type: String,
        enum: ['classification', 'regression', 'clustering', 'dimensionality_reduction'],
        required: true
    },
    preprocessingApplied: {
        type: Boolean,
        default: false
    },
    preprocessingSteps: [{
        step: String,
        timestamp: Date,
        details: mongoose.Schema.Types.Mixed
    }],
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['uploaded', 'preprocessing', 'ready', 'error'],
        default: 'uploaded'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Dataset', datasetSchema);
