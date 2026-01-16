/**
 * Experiment Model
 * Schema for ML experiments and training sessions
 */

const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide an experiment name'],
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
    dataset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dataset',
        required: true
    },
    problemType: {
        type: String,
        enum: ['classification', 'regression', 'clustering', 'neural_network'],
        required: true
    },
    algorithm: {
        type: String,
        required: true
    },
    hyperparameters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    tuningApplied: {
        type: Boolean,
        default: false
    },
    tuningResults: {
        type: mongoose.Schema.Types.Mixed
    },
    trainingMetrics: {
        type: mongoose.Schema.Types.Mixed
    },
    testMetrics: {
        type: mongoose.Schema.Types.Mixed
    },
    predictions: {
        type: mongoose.Schema.Types.Mixed
    },
    visualizations: [{
        type: String,
        url: String
    }],
    trainingTime: {
        type: Number // in seconds
    },
    status: {
        type: String,
        enum: ['created', 'training', 'completed', 'failed'],
        default: 'created'
    },
    errorMessage: {
        type: String
    },
    modelPath: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Experiment', experimentSchema);
