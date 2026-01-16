/**
 * Experiment Controller
 * Manages experiment lifecycle and proxies training/tuning to the ML microservice
 */

const axios = require('axios');
const Experiment = require('../models/Experiment');
const Dataset = require('../models/Dataset');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const handleProxyError = (res, error) => {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message || 'ML service error';
    return res.status(status).json({ success: false, error: message });
};

const coerceValue = (value) => {
    if (value === null || value === undefined) return value;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
};

const prepareDatasetPayload = (dataset) => {
    const columns = dataset.columns.map((c) => c.name);
    const targetColumn = dataset.targetColumn;

    if (!targetColumn) {
        throw new Error('Target column is required before training');
    }

    const featureColumns = columns.filter((c) => c !== targetColumn);

    const X = dataset.data.map((row) => featureColumns.map((col) => coerceValue(row[col])));
    const y = dataset.data.map((row) => coerceValue(row[targetColumn]));

    return { X, y, featureColumns, targetColumn };
};

exports.createExperiment = async (req, res) => {
    try {
        const { name, description, problemType, dataset: datasetId, algorithm, hyperparameters, tuningApplied } = req.body;

        const dataset = await Dataset.findOne({ _id: datasetId, user: req.user._id });
        if (!dataset) {
            return res.status(404).json({ success: false, error: 'Dataset not found' });
        }

        const experiment = await Experiment.create({
            name,
            description,
            problemType,
            dataset: datasetId,
            algorithm,
            hyperparameters: hyperparameters || {},
            tuningApplied: Boolean(tuningApplied),
            user: req.user._id,
            status: 'created'
        });

        return res.status(201).json({ success: true, data: experiment });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.getExperiments = async (req, res) => {
    try {
        const experiments = await Experiment.find({ user: req.user._id }).sort('-createdAt');
        return res.json({ success: true, count: experiments.length, data: experiments });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.getExperimentById = async (req, res) => {
    try {
        const experiment = await Experiment.findOne({ _id: req.params.id, user: req.user._id });
        if (!experiment) {
            return res.status(404).json({ success: false, error: 'Experiment not found' });
        }
        return res.json({ success: true, data: experiment });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.trainModel = async (req, res) => {
    try {
        const experiment = await Experiment.findOne({ _id: req.params.id, user: req.user._id });
        if (!experiment) {
            return res.status(404).json({ success: false, error: 'Experiment not found' });
        }

        const dataset = await Dataset.findById(experiment.dataset);
        if (!dataset || !dataset.data) {
            return res.status(400).json({ success: false, error: 'Dataset is missing or has no data' });
        }

        const { X, y } = prepareDatasetPayload(dataset);

        experiment.status = 'training';
        await experiment.save();

        const payload = {
            algorithm: experiment.algorithm,
            problem_type: experiment.problemType,
            X_train: X,
            y_train: y,
            hyperparameters: experiment.hyperparameters || {},
        };

        try {
            const { data } = await axios.post(`${ML_SERVICE_URL}/ml/train`, payload);
            experiment.trainingMetrics = data.training_metrics || data.metrics || {};
            experiment.testMetrics = data.test_metrics || data.metrics || {};
            experiment.status = 'completed';
            await experiment.save();
            return res.json({ success: true, data: experiment });
        } catch (error) {
            experiment.status = 'failed';
            experiment.errorMessage = error.message;
            await experiment.save();
            return handleProxyError(res, error);
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.tuneHyperparameters = async (req, res) => {
    try {
        const experiment = await Experiment.findOne({ _id: req.params.id, user: req.user._id });
        if (!experiment) {
            return res.status(404).json({ success: false, error: 'Experiment not found' });
        }

        const dataset = await Dataset.findById(experiment.dataset);
        if (!dataset || !dataset.data) {
            return res.status(400).json({ success: false, error: 'Dataset is missing or has no data' });
        }

        const { X, y } = prepareDatasetPayload(dataset);

        const payload = {
            algorithm: experiment.algorithm,
            problem_type: experiment.problemType,
            X_train: X,
            y_train: y,
            param_grid: req.body.param_grid || experiment.hyperparameters || {},
            cv: req.body.cv || 5,
        };

        try {
            const { data } = await axios.post(`${ML_SERVICE_URL}/ml/tune`, payload);
            experiment.tuningApplied = true;
            experiment.tuningResults = data;
            experiment.status = 'completed';
            await experiment.save();
            return res.json({ success: true, data: experiment });
        } catch (error) {
            experiment.status = 'failed';
            experiment.errorMessage = error.message;
            await experiment.save();
            return handleProxyError(res, error);
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteExperiment = async (req, res) => {
    try {
        const experiment = await Experiment.findOne({ _id: req.params.id, user: req.user._id });
        if (!experiment) {
            return res.status(404).json({ success: false, error: 'Experiment not found' });
        }

        await experiment.deleteOne();
        return res.json({ success: true, data: {} });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
