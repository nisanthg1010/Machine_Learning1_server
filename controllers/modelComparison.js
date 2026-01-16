/**
 * Model Comparison Controller
 * Handles training multiple models and comparing their performance
 */

const Dataset = require('../models/Dataset');
const Experiment = require('../models/Experiment');
const axios = require('axios');

// @desc    Train multiple models and compare performance
// @route   POST /api/experiments/train-multiple
// @access  Private
exports.trainMultipleModels = async (req, res) => {
    try {
        const { datasetId, algorithms, testSize, problemType } = req.body;

        // Validate input
        if (!datasetId || !algorithms || algorithms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Dataset ID and algorithms array are required'
            });
        }

        // Get dataset
        const dataset = await Dataset.findOne({
            _id: datasetId,
            user: req.user._id
        });

        if (!dataset) {
            return res.status(404).json({
                success: false,
                error: 'Dataset not found'
            });
        }

        // Prepare data
        const columns = dataset.columns.map(c => c.name);
        let data = [];

        // Read from file if available, else use stored data
        if (dataset.filePath) {
            const fs = require('fs');
            const csv = require('csv-parser');
            data = await new Promise((resolve, reject) => {
                const rows = [];
                fs.createReadStream(dataset.filePath)
                    .pipe(csv())
                    .on('data', (row) => rows.push(row))
                    .on('end', () => resolve(rows))
                    .on('error', reject);
            });
        } else {
            data = dataset.data;
        }

        // Convert to arrays
        const X = data.map(row => columns.map(col => {
            const val = row[col];
            return isNaN(val) ? val : parseFloat(val);
        }));

        const targetCol = dataset.targetColumn || columns[columns.length - 1];
        const y = data.map(row => {
            const val = row[targetCol];
            return isNaN(val) ? val : parseFloat(val);
        });

        // Split train/test
        const trainSize = Math.floor(X.length * (1 - testSize));
        const X_train = X.slice(0, trainSize);
        const y_train = y.slice(0, trainSize);
        const X_test = X.slice(trainSize);
        const y_test = y.slice(trainSize);

        // Train all selected algorithms
        const results = {};
        let bestModel = null;
        let bestScore = -Infinity;

        for (const algorithm of algorithms) {
            try {
                const trainingResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL}/ml/train`,
                    {
                        algorithm,
                        problem_type: problemType,
                        X_train,
                        y_train,
                        X_test,
                        y_test,
                        hyperparameters: getDefaultHyperparameters(algorithm)
                    }
                );

                const modelResult = trainingResponse.data;
                results[algorithm] = modelResult;

                // Determine score based on problem type
                let score = 0;
                if (problemType === 'classification') {
                    score = modelResult.test_metrics?.accuracy || modelResult.training_metrics?.accuracy || 0;
                } else if (problemType === 'regression') {
                    score = modelResult.test_metrics?.r2_score || modelResult.training_metrics?.r2_score || 0;
                } else if (problemType === 'clustering') {
                    score = modelResult.metrics?.silhouette_score || 0;
                }

                // Track best model
                if (score > bestScore) {
                    bestScore = score;
                    bestModel = {
                        algorithm,
                        score,
                        metrics: problemType === 'classification'
                            ? modelResult.test_metrics || modelResult.training_metrics
                            : modelResult.test_metrics || modelResult.training_metrics
                    };
                }
            } catch (error) {
                console.error(`Error training ${algorithm}:`, error.message);
                results[algorithm] = {
                    error: error.message,
                    training_metrics: null
                };
            }
        }

        // Create experiment record
        const experiment = await Experiment.create({
            user: req.user._id,
            dataset: datasetId,
            name: `Multi-Model Training - ${new Date().toLocaleString()}`,
            algorithms: algorithms,
            problemType,
            testSize,
            results: results,
            bestModel: bestModel,
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            data: {
                experimentId: experiment._id,
                results,
                bestModel,
                summary: {
                    algorithmsTraining: algorithms.length,
                    successfulModels: Object.values(results).filter(r => !r.error).length,
                    testSize: testSize,
                    trainingSize: 1 - testSize,
                    datasetName: dataset.name,
                    problemType
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            traceback: error.stack
        });
    }
};

// Helper function to get default hyperparameters
function getDefaultHyperparameters(algorithm) {
    const defaults = {
        // Regression
        'linear_regression': {},
        'ridge_regression': { alpha: 1.0 },
        'lasso_regression': { alpha: 1.0 },
        'elastic_net': { alpha: 1.0, l1_ratio: 0.5 },
        'decision_tree_regressor': { max_depth: 10, min_samples_split: 5 },
        'random_forest_regressor': { n_estimators: 100, max_depth: 10, min_samples_split: 5 },
        'extra_trees_regressor': { n_estimators: 100, max_depth: 10 },
        'gradient_boosting_regressor': { n_estimators: 100, learning_rate: 0.1, max_depth: 5 },
        'adaboost_regressor': { n_estimators: 100, learning_rate: 0.1 },
        'svm_regressor': { kernel: 'rbf', C: 1.0, gamma: 'scale' },
        'knn_regressor': { n_neighbors: 5, weights: 'uniform' },

        // Classification
        'logistic_regression': { C: 1.0, max_iter: 1000 },
        'lda': { solver: 'svd' },
        'qda': {},
        'decision_tree_classifier': { max_depth: 10, min_samples_split: 5 },
        'random_forest_classifier': { n_estimators: 100, max_depth: 10, min_samples_split: 5 },
        'extra_trees_classifier': { n_estimators: 100, max_depth: 10 },
        'gradient_boosting_classifier': { n_estimators: 100, learning_rate: 0.1, max_depth: 5 },
        'adaboost_classifier': { n_estimators: 100, learning_rate: 0.1 },
        'svm_classifier': { kernel: 'rbf', C: 1.0, gamma: 'scale' },
        'knn_classifier': { n_neighbors: 5, weights: 'uniform' },
        'gaussian_nb': {},
        'multinomial_nb': { alpha: 1.0 },

        // Clustering
        'kmeans': { n_clusters: 3, n_init: 10 },
        'hierarchical': { n_clusters: 3, linkage: 'ward' },
        'dbscan': { eps: 0.5, min_samples: 5 },
        'gaussian_mixture': { n_components: 3 },

        // Dimensionality Reduction
        'pca': { n_components: 2 },
        'tsne': { n_components: 2, perplexity: 30 },
        'isomap': { n_components: 2, n_neighbors: 5 }
    };

    return defaults[algorithm] || {};
}

module.exports = exports;
