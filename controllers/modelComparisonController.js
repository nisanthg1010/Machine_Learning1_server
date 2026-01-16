/**
 * Model Comparison Controller
 * Handles model training, evaluation, and comparison
 */

const Experiment = require('../models/Experiment');
const Dataset = require('../models/Dataset');
const axios = require('axios');

// @desc    Train multiple models and compare them
// @route   POST /api/experiments/compare-models
// @access  Private
exports.compareModels = async (req, res) => {
    try {
        const { datasetId, problemType, trainTestSplit = 0.2, algorithms = null } = req.body;

        // Validate dataset exists
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

        // Prepare data for ML service
        const dataSize = dataset.numberOfRows;
        const testSize = Math.ceil(dataSize * trainTestSplit);
        const trainSize = dataSize - testSize;

        // Call ML service to train multiple models
        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/ml/compare-models`,
            {
                dataset_id: datasetId,
                problem_type: problemType,
                train_size: trainSize,
                test_size: testSize,
                train_test_split: trainTestSplit,
                algorithms: algorithms,
                data: dataset.data || [],
                columns: dataset.columns.map(c => c.name),
                target_column: dataset.targetColumn
            }
        );

        // Find best model
        const bestModel = findBestModel(mlResponse.data.models, problemType);

        // Create experiment record
        const experiment = await Experiment.create({
            user: req.user._id,
            dataset: datasetId,
            name: `Model Comparison - ${new Date().toLocaleDateString()}`,
            description: `Trained ${mlResponse.data.models.length} models on ${datasetId}`,
            problemType: problemType,
            status: 'completed',
            models: mlResponse.data.models,
            bestModel: bestModel,
            trainTestSplit: trainTestSplit,
            metrics: {
                totalModels: mlResponse.data.models.length,
                bestModelScore: bestModel.primaryMetric,
                evaluationTime: mlResponse.data.evaluationTime
            }
        });

        res.status(200).json({
            success: true,
            data: {
                experiment: experiment,
                models: mlResponse.data.models,
                bestModel: bestModel,
                recommendations: getAlgorithmRecommendations(problemType)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Find best performing model
function findBestModel(models, problemType) {
    if (!models || models.length === 0) return null;

    let best = models[0];
    
    if (problemType === 'classification') {
        // Compare by F1 Score
        for (let model of models) {
            const bestF1 = best.f1_score || best.test_metrics?.f1_score || 0;
            const currentF1 = model.f1_score || model.test_metrics?.f1_score || 0;
            
            if (currentF1 > bestF1) {
                best = model;
            }
        }
        best.primaryMetric = best.f1_score || best.test_metrics?.f1_score || 0;
    } else if (problemType === 'regression') {
        // Compare by R² Score
        for (let model of models) {
            const bestR2 = best.r2_score || best.test_metrics?.r2_score || -Infinity;
            const currentR2 = model.r2_score || model.test_metrics?.r2_score || -Infinity;
            
            if (currentR2 > bestR2) {
                best = model;
            }
        }
        best.primaryMetric = best.r2_score || best.test_metrics?.r2_score || 0;
    } else if (problemType === 'clustering') {
        // Compare by Silhouette Score
        for (let model of models) {
            const bestScore = best.silhouette_score || 0;
            const currentScore = model.silhouette_score || 0;
            
            if (currentScore > bestScore) {
                best = model;
            }
        }
        best.primaryMetric = best.silhouette_score || 0;
    }
    
    return best;
}

// Get algorithm recommendations based on problem type
function getAlgorithmRecommendations(problemType) {
    const recommendations = {
        classification: [
            {
                rank: 1,
                algorithm: 'Random Forest Classifier',
                reason: 'Excellent balance of accuracy and interpretability, handles feature interactions well',
                expectedAccuracy: '0.82-0.95'
            },
            {
                rank: 2,
                algorithm: 'Gradient Boosting Classifier',
                reason: 'High accuracy, strong for both linear and non-linear patterns',
                expectedAccuracy: '0.80-0.96'
            },
            {
                rank: 3,
                algorithm: 'SVM Classifier',
                reason: 'Excellent for high-dimensional data and non-linear decision boundaries',
                expectedAccuracy: '0.78-0.94'
            },
            {
                rank: 4,
                algorithm: 'Logistic Regression',
                reason: 'Fast baseline, interpretable coefficients, good for linear relationships',
                expectedAccuracy: '0.70-0.85'
            }
        ],
        regression: [
            {
                rank: 1,
                algorithm: 'Gradient Boosting Regressor',
                reason: 'High accuracy for non-linear relationships, handles outliers well',
                expectedR2: '0.85-0.99'
            },
            {
                rank: 2,
                algorithm: 'Random Forest Regressor',
                reason: 'Robust to noise, good for feature interactions',
                expectedR2: '0.80-0.95'
            },
            {
                rank: 3,
                algorithm: 'SVR (Support Vector Regression)',
                reason: 'Strong for non-linear patterns in high dimensions',
                expectedR2: '0.75-0.92'
            },
            {
                rank: 4,
                algorithm: 'Ridge Regression',
                reason: 'Fast baseline with regularization, interpretable',
                expectedR2: '0.65-0.85'
            }
        ],
        clustering: [
            {
                rank: 1,
                algorithm: 'DBSCAN',
                reason: 'Finds arbitrary-shaped clusters, no need to specify cluster count',
                expectedScore: '0.70-0.95'
            },
            {
                rank: 2,
                algorithm: 'KMeans',
                reason: 'Fast and efficient for spherical clusters',
                expectedScore: '0.65-0.90'
            },
            {
                rank: 3,
                algorithm: 'Hierarchical Clustering',
                reason: 'Provides dendrograms for cluster exploration',
                expectedScore: '0.60-0.85'
            }
        ]
    };

    return recommendations[problemType] || recommendations.classification;
}

// @desc    Get model evaluation metrics with formulas
// @route   GET /api/experiments/metrics-reference
// @access  Public
exports.getMetricsReference = (req, res) => {
    const metricsReference = {
        classification: {
            accuracy: {
                name: 'Accuracy',
                formula: '(TP + TN) / (TP + TN + FP + FN)',
                description: 'Proportion of correct predictions',
                range: '0 to 1 (higher is better)',
                when_to_use: 'Balanced datasets without class imbalance',
                formula_explanation: {
                    TP: 'True Positives - correctly predicted positive',
                    TN: 'True Negatives - correctly predicted negative',
                    FP: 'False Positives - incorrectly predicted positive',
                    FN: 'False Negatives - incorrectly predicted negative'
                }
            },
            precision: {
                name: 'Precision',
                formula: 'TP / (TP + FP)',
                description: 'Of all positive predictions, how many were correct?',
                range: '0 to 1 (higher is better)',
                when_to_use: 'When false positives are costly (spam detection, fraud detection)',
                formula_explanation: {
                    TP: 'True Positives',
                    FP: 'False Positives'
                }
            },
            recall: {
                name: 'Recall (Sensitivity, True Positive Rate)',
                formula: 'TP / (TP + FN)',
                description: 'Of all actual positives, how many were correctly identified?',
                range: '0 to 1 (higher is better)',
                when_to_use: 'When false negatives are costly (disease detection, safety-critical)',
                formula_explanation: {
                    TP: 'True Positives',
                    FN: 'False Negatives'
                }
            },
            f1_score: {
                name: 'F1 Score',
                formula: '2 × (Precision × Recall) / (Precision + Recall)',
                description: 'Harmonic mean of precision and recall, balanced metric',
                range: '0 to 1 (higher is better)',
                when_to_use: 'Imbalanced datasets, when you need balance between precision and recall',
                formula_explanation: {
                    Precision: 'As defined above',
                    Recall: 'As defined above'
                }
            },
            specificity: {
                name: 'Specificity (True Negative Rate)',
                formula: 'TN / (TN + FP)',
                description: 'Of all actual negatives, how many were correctly identified?',
                range: '0 to 1 (higher is better)',
                when_to_use: 'Medical diagnostics, when correct negative identification is important',
                formula_explanation: {
                    TN: 'True Negatives',
                    FP: 'False Positives'
                }
            },
            auc_roc: {
                name: 'AUC-ROC (Area Under Receiver Operating Characteristic Curve)',
                formula: 'Area under ROC curve at different classification thresholds',
                description: 'Probability that model ranks a random positive higher than a random negative',
                range: '0 to 1 (higher is better)',
                when_to_use: 'Binary classification, when you want threshold-independent evaluation',
                formula_explanation: {
                    'True Positive Rate': 'Recall',
                    'False Positive Rate': '1 - Specificity'
                }
            }
        },
        regression: {
            mse: {
                name: 'Mean Squared Error (MSE)',
                formula: '(1/n) × Σ(y_i - ŷ_i)²',
                description: 'Average squared difference between actual and predicted values',
                range: '0 to ∞ (lower is better)',
                when_to_use: 'General regression, penalizes large errors more heavily',
                formula_explanation: {
                    'y_i': 'Actual value',
                    'ŷ_i': 'Predicted value',
                    'n': 'Number of samples'
                }
            },
            rmse: {
                name: 'Root Mean Squared Error (RMSE)',
                formula: '√(MSE) = √((1/n) × Σ(y_i - ŷ_i)²)',
                description: 'Square root of MSE, in same units as target variable',
                range: '0 to ∞ (lower is better)',
                when_to_use: 'Regression, interpretable error magnitude in original units',
                formula_explanation: {
                    MSE: 'Mean Squared Error'
                }
            },
            mae: {
                name: 'Mean Absolute Error (MAE)',
                formula: '(1/n) × Σ|y_i - ŷ_i|',
                description: 'Average absolute difference between actual and predicted values',
                range: '0 to ∞ (lower is better)',
                when_to_use: 'Regression with outliers, treats all errors equally',
                formula_explanation: {
                    'y_i': 'Actual value',
                    'ŷ_i': 'Predicted value',
                    'n': 'Number of samples'
                }
            },
            r2_score: {
                name: 'R² Score (Coefficient of Determination)',
                formula: '1 - (SS_res / SS_tot)',
                description: 'Proportion of variance in dependent variable predictable from independents',
                range: '-∞ to 1 (higher is better, 1 is perfect)',
                when_to_use: 'Regression, indicates how well model explains variance in data',
                formula_explanation: {
                    'SS_res': 'Sum of squared residuals (Σ(y_i - ŷ_i)²)',
                    'SS_tot': 'Total sum of squares (Σ(y_i - ȳ)²)',
                    'ȳ': 'Mean of actual values'
                }
            },
            adjusted_r2: {
                name: 'Adjusted R²',
                formula: '1 - ((1 - R²) × (n - 1) / (n - p - 1))',
                description: 'R² adjusted for number of predictors, penalizes model complexity',
                range: '-∞ to 1 (higher is better)',
                when_to_use: 'Comparing models with different numbers of features',
                formula_explanation: {
                    'R²': 'R² Score',
                    'n': 'Number of samples',
                    'p': 'Number of predictors'
                }
            }
        },
        clustering: {
            silhouette_score: {
                name: 'Silhouette Score',
                formula: '(b - a) / max(a, b)',
                description: 'Measure of how similar an object is to its own cluster vs other clusters',
                range: '-1 to 1 (higher is better, >0.5 is good)',
                when_to_use: 'Evaluating cluster quality and separation',
                formula_explanation: {
                    'a': 'Mean distance between a point and others in same cluster',
                    'b': 'Mean distance between a point and nearest cluster'
                }
            },
            davies_bouldin_score: {
                name: 'Davies-Bouldin Index',
                formula: '(1/k) × Σ max(R_ij)',
                description: 'Average similarity between each cluster and its most similar cluster',
                range: '0 to ∞ (lower is better)',
                when_to_use: 'Evaluating cluster separation, no ground truth needed',
                formula_explanation: {
                    'k': 'Number of clusters',
                    'R_ij': 'Similarity between cluster i and j'
                }
            },
            calinski_harabasz_score: {
                name: 'Calinski-Harabasz Index (Variance Ratio Criterion)',
                formula: '(SS_b / (k-1)) / (SS_w / (n-k))',
                description: 'Ratio of between-cluster to within-cluster dispersion',
                range: '0 to ∞ (higher is better)',
                when_to_use: 'Evaluating cluster quality, favors convex shapes',
                formula_explanation: {
                    'SS_b': 'Between-cluster sum of squares',
                    'SS_w': 'Within-cluster sum of squares',
                    'k': 'Number of clusters',
                    'n': 'Number of samples'
                }
            }
        }
    };

    res.status(200).json({
        success: true,
        data: metricsReference
    });
};

// @desc    Get hyperparameters for specific algorithm
// @route   GET /api/experiments/hyperparameters/:algorithm
// @access  Public
exports.getHyperparameters = (req, res) => {
    const { algorithm } = req.params;

    const hyperparameters = {
        random_forest_classifier: {
            n_estimators: { type: 'integer', default: 100, range: '10-1000', description: 'Number of trees' },
            max_depth: { type: 'integer', default: null, range: '1-50', description: 'Maximum depth of trees' },
            min_samples_split: { type: 'integer', default: 2, range: '2-100', description: 'Minimum samples to split' },
            max_features: { type: 'string', default: 'sqrt', options: ['sqrt', 'log2', null], description: 'Features to consider for split' }
        },
        gradient_boosting_classifier: {
            n_estimators: { type: 'integer', default: 100, range: '10-1000', description: 'Number of boosting stages' },
            learning_rate: { type: 'float', default: 0.1, range: '0.001-1.0', description: 'Learning rate shrinkage' },
            max_depth: { type: 'integer', default: 3, range: '1-10', description: 'Maximum depth of trees' },
            subsample: { type: 'float', default: 1.0, range: '0.1-1.0', description: 'Fraction of samples for fitting' }
        },
        svm_classifier: {
            kernel: { type: 'string', default: 'rbf', options: ['linear', 'rbf', 'poly', 'sigmoid'], description: 'Kernel type' },
            C: { type: 'float', default: 1.0, range: '0.001-1000', description: 'Regularization parameter' },
            gamma: { type: 'string', default: 'scale', options: ['scale', 'auto'], description: 'Kernel coefficient' }
        },
        logistic_regression: {
            C: { type: 'float', default: 1.0, range: '0.001-1000', description: 'Inverse regularization strength' },
            penalty: { type: 'string', default: 'l2', options: ['l2', 'l1'], description: 'Regularization type' },
            solver: { type: 'string', default: 'lbfgs', options: ['lbfgs', 'liblinear', 'saga'], description: 'Optimization algorithm' }
        }
    };

    const params = hyperparameters[algorithm];
    if (!params) {
        return res.status(404).json({
            success: false,
            error: `Hyperparameters for algorithm '${algorithm}' not found`
        });
    }

    res.status(200).json({
        success: true,
        data: {
            algorithm: algorithm,
            hyperparameters: params
        }
    });
};

module.exports = exports;
