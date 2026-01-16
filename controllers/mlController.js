/**
 * ML Controller
 * Proxies requests from the API server to the Python ML microservice
 */

const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Normalize error responses from the ML service
const handleProxyError = (res, error) => {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message || 'ML service error';
    return res.status(status).json({ success: false, error: message });
};

exports.getAlgorithms = async (req, res) => {
    try {
        const { data } = await axios.get(`${ML_SERVICE_URL}/ml/algorithms`);
        return res.json({ success: true, data });
    } catch (error) {
        return handleProxyError(res, error);
    }
};

exports.preprocessData = async (req, res) => {
    try {
        const { data } = await axios.post(`${ML_SERVICE_URL}/ml/preprocess`, req.body);
        return res.json({ success: true, data });
    } catch (error) {
        return handleProxyError(res, error);
    }
};

exports.trainModel = async (req, res) => {
    try {
        const { data } = await axios.post(`${ML_SERVICE_URL}/ml/train`, req.body);
        return res.json({ success: true, data });
    } catch (error) {
        return handleProxyError(res, error);
    }
};

exports.evaluateModel = async (req, res) => {
    try {
        const { data } = await axios.post(`${ML_SERVICE_URL}/ml/evaluate`, req.body);
        return res.json({ success: true, data });
    } catch (error) {
        return handleProxyError(res, error);
    }
};

exports.tuneHyperparameters = async (req, res) => {
    try {
        const { data } = await axios.post(`${ML_SERVICE_URL}/ml/tune`, req.body);
        return res.json({ success: true, data });
    } catch (error) {
        return handleProxyError(res, error);
    }
};
