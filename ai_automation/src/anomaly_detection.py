"""
AI-powered anomaly detection system for application monitoring
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnomalyDetectionEngine:
    """
    Advanced anomaly detection engine using machine learning
    """
    
    def __init__(self, config_path: str = "config/anomaly_config.json"):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = []
        self.thresholds = {}
        self.model_path = "models/anomaly_detector.pkl"
        self.scaler_path = "models/scaler.pkl"
        
        # Load configuration
        self.config = self._load_config(config_path)
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {config_path} not found, using defaults")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Default configuration for anomaly detection"""
        return {
            "contamination": 0.1,
            "random_state": 42,
            "n_estimators": 100,
            "max_samples": "auto",
            "bootstrap": False,
            "feature_weights": {
                "response_time": 1.5,
                "error_rate": 2.0,
                "cpu_usage": 1.2,
                "memory_usage": 1.3,
                "throughput": 1.0,
                "db_response_time": 1.4,
                "active_users": 0.8,
                "queue_length": 1.1
            },
            "severity_thresholds": {
                "low": -0.1,
                "medium": -0.3,
                "high": -0.5,
                "critical": -0.7
            }
        }
    
    def prepare_features(self, metrics_list: List[Dict[str, float]]) -> np.ndarray:
        """Convert metrics to feature vectors"""
        features = []
        
        if not self.feature_names and metrics_list:
            # Extract feature names from first metrics dict
            self.feature_names = [
                'response_time', 'error_rate', 'cpu_usage', 'memory_usage',
                'throughput', 'db_response_time', 'active_users', 'queue_length',
                'document_processing_success_rate', 'user_satisfaction_score'
            ]
        
        for metrics in metrics_list:
            feature_vector = []
            for feature_name in self.feature_names:
                value = metrics.get(feature_name, 0)
                # Apply feature weights
                weight = self.config.get("feature_weights", {}).get(feature_name, 1.0)
                feature_vector.append(value * weight)
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_on_historical_data(self, historical_metrics: List[Dict[str, float]]) -> None:
        """Train the anomaly detection model on historical data"""
        logger.info(f"Training anomaly detection model on {len(historical_metrics)} samples")
        
        X = self.prepare_features(historical_metrics)
        
        # Initialize Isolation Forest
        self.model = IsolationForest(
            contamination=self.config.get("contamination", 0.1),
            random_state=self.config.get("random_state", 42),
            n_estimators=self.config.get("n_estimators", 100),
            max_samples=self.config.get("max_samples", "auto"),
            bootstrap=self.config.get("bootstrap", False)
        )
        
        # Fit scaler and model
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        
        self.is_trained = True
        
        # Calculate baseline thresholds
        scores = self.model.decision_function(X_scaled)
        self._calculate_dynamic_thresholds(scores)
        
        # Save model and scaler
        self._save_model()
        
        logger.info("Anomaly detection model training completed")
    
    def _calculate_dynamic_thresholds(self, scores: np.ndarray) -> None:
        """Calculate dynamic thresholds based on score distribution"""
        percentiles = [75, 85, 95, 99]
        threshold_names = ['low', 'medium', 'high', 'critical']
        
        for percentile, name in zip(percentiles, threshold_names):
            threshold = np.percentile(scores, percentile)
            self.thresholds[name] = threshold
        
        logger.info(f"Dynamic thresholds calculated: {self.thresholds}")
    
    def detect_anomalies(self, current_metrics: Dict[str, float]) -> Dict[str, Any]:
        """Detect anomalies in current metrics"""
        if not self.is_trained:
            self._load_trained_model()
        
        X = self.prepare_features([current_metrics])
        X_scaled = self.scaler.transform(X)
        
        # Get anomaly score
        anomaly_score = self.model.decision_function(X_scaled)[0]
        is_anomaly = self.model.predict(X_scaled)[0] == -1
        
        # Determine severity
        severity = self._determine_severity(anomaly_score)
        
        # Identify affected metrics
        affected_metrics = self._identify_affected_metrics(current_metrics)
        
        # Generate insights
        insights = self._generate_insights(current_metrics, anomaly_score, affected_metrics)
        
        return {
            'is_anomaly': is_anomaly,
            'severity': severity,
            'anomaly_score': float(anomaly_score),
            'affected_metrics': affected_metrics,
            'insights': insights,
            'timestamp': datetime.now().isoformat(),
            'confidence': self._calculate_confidence(anomaly_score)
        }
    
    def _determine_severity(self, score: float) -> str:
        """Determine severity level based on anomaly score"""
        if score <= self.thresholds.get('critical', -0.7):
            return 'CRITICAL'
        elif score <= self.thresholds.get('high', -0.5):
            return 'HIGH'
        elif score <= self.thresholds.get('medium', -0.3):
            return 'MEDIUM'
        elif score <= self.thresholds.get('low', -0.1):
            return 'LOW'
        else:
            return 'NORMAL'
    
    def _identify_affected_metrics(self, metrics: Dict[str, float]) -> List[Dict[str, Any]]:
        """Identify which specific metrics are anomalous"""
        affected = []
        
        # Define normal ranges for each metric
        normal_ranges = {
            'response_time': (0, 2000),
            'error_rate': (0, 5),
            'cpu_usage': (0, 70),
            'memory_usage': (0, 80),
            'throughput': (50, float('inf')),
            'db_response_time': (0, 1000),
            'active_users': (0, float('inf')),
            'queue_length': (0, 50),
            'document_processing_success_rate': (95, 100),
            'user_satisfaction_score': (7, 10)
        }
        
        for metric_name, value in metrics.items():
            if metric_name in normal_ranges:
                min_val, max_val = normal_ranges[metric_name]
                if not (min_val <= value <= max_val):
                    deviation = self._calculate_deviation(value, min_val, max_val)
                    affected.append({
                        'metric': metric_name,
                        'value': value,
                        'normal_range': [min_val, max_val],
                        'deviation_percentage': deviation,
                        'severity': 'HIGH' if deviation > 50 else 'MEDIUM' if deviation > 25 else 'LOW'
                    })
        
        return affected
    
    def _calculate_deviation(self, value: float, min_val: float, max_val: float) -> float:
        """Calculate percentage deviation from normal range"""
        if value < min_val:
            if min_val == 0:
                return abs(value) * 100
            return abs((min_val - value) / min_val) * 100
        elif value > max_val:
            if max_val == float('inf'):
                return 0
            return abs((value - max_val) / max_val) * 100
        return 0
    
    def _generate_insights(self, metrics: Dict[str, float], score: float, 
                          affected_metrics: List[Dict[str, Any]]) -> List[str]:
        """Generate human-readable insights about the anomaly"""
        insights = []
        
        # General insights based on score
        if score < -0.7:
            insights.append("Critical system anomaly detected - immediate attention required")
        elif score < -0.5:
            insights.append("Significant performance degradation detected")
        elif score < -0.3:
            insights.append("Moderate system anomaly - monitoring recommended")
        
        # Metric-specific insights
        for affected in affected_metrics:
            metric = affected['metric']
            value = affected['value']
            deviation = affected['deviation_percentage']
            
            if metric == 'response_time' and value > 3000:
                insights.append(f"Response time is critically high: {value:.0f}ms (>{deviation:.0f}% above normal)")
            elif metric == 'error_rate' and value > 10:
                insights.append(f"Error rate is unacceptably high: {value:.1f}% (>{deviation:.0f}% above normal)")
            elif metric == 'memory_usage' and value > 90:
                insights.append(f"Memory usage is critically high: {value:.1f}% - risk of OOM")
            elif metric == 'cpu_usage' and value > 85:
                insights.append(f"CPU usage is critically high: {value:.1f}% - performance degradation likely")
            elif metric == 'document_processing_success_rate' and value < 90:
                insights.append(f"Document processing failure rate is high: {100-value:.1f}% failures")
        
        # Pattern-based insights
        if (metrics.get('error_rate', 0) > 5 and 
            metrics.get('response_time', 0) > 2000):
            insights.append("Correlation detected: High error rate with slow response times")
        
        if (metrics.get('memory_usage', 0) > 80 and 
            metrics.get('cpu_usage', 0) > 70):
            insights.append("Resource exhaustion pattern: Both memory and CPU usage are high")
        
        return insights
    
    def _calculate_confidence(self, score: float) -> float:
        """Calculate confidence level of the anomaly detection"""
        # Confidence based on how far the score is from the decision boundary
        abs_score = abs(score)
        max_confidence_threshold = 1.0
        
        confidence = min(abs_score / max_confidence_threshold, 1.0)
        return round(confidence, 3)
    
    def _save_model(self) -> None:
        """Save trained model and scaler to disk"""
        try:
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            
            # Save metadata
            metadata = {
                'feature_names': self.feature_names,
                'thresholds': self.thresholds,
                'config': self.config,
                'trained_at': datetime.now().isoformat()
            }
            
            with open('models/metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info("Model and metadata saved successfully")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def _load_trained_model(self) -> None:
        """Load pre-trained model and scaler from disk"""
        try:
            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            
            # Load metadata
            with open('models/metadata.json', 'r') as f:
                metadata = json.load(f)
                self.feature_names = metadata['feature_names']
                self.thresholds = metadata['thresholds']
            
            self.is_trained = True
            logger.info("Pre-trained model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError("No trained model available and training data not provided")
    
    def batch_detect_anomalies(self, metrics_batch: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        """Detect anomalies in a batch of metrics"""
        results = []
        
        for metrics in metrics_batch:
            result = self.detect_anomalies(metrics)
            results.append(result)
        
        return results
    
    def update_model(self, new_data: List[Dict[str, float]], retrain: bool = False) -> None:
        """Update model with new data"""
        if retrain:
            logger.info("Retraining model with new data")
            self.train_on_historical_data(new_data)
        else:
            # Incremental learning (simplified approach)
            logger.info("Updating model thresholds with new data")
            X = self.prepare_features(new_data)
            X_scaled = self.scaler.transform(X)
            scores = self.model.decision_function(X_scaled)
            
            # Update thresholds based on new data
            self._calculate_dynamic_thresholds(scores)
            self._save_model()

def generate_sample_data(num_samples: int = 1000) -> List[Dict[str, float]]:
    """Generate sample training data for testing"""
    np.random.seed(42)
    
    data = []
    for i in range(num_samples):
        # Normal operating conditions
        sample = {
            'response_time': np.random.normal(800, 200),
            'error_rate': np.random.exponential(2),
            'cpu_usage': np.random.normal(40, 15),
            'memory_usage': np.random.normal(60, 20),
            'throughput': np.random.normal(500, 100),
            'db_response_time': np.random.normal(200, 50),
            'active_users': np.random.poisson(200),
            'queue_length': np.random.poisson(10),
            'document_processing_success_rate': np.random.normal(98, 2),
            'user_satisfaction_score': np.random.normal(8.5, 1)
        }
        
        # Ensure realistic bounds
        sample['response_time'] = max(100, sample['response_time'])
        sample['error_rate'] = max(0, min(20, sample['error_rate']))
        sample['cpu_usage'] = max(0, min(100, sample['cpu_usage']))
        sample['memory_usage'] = max(0, min(100, sample['memory_usage']))
        sample['throughput'] = max(10, sample['throughput'])
        sample['document_processing_success_rate'] = max(0, min(100, sample['document_processing_success_rate']))
        sample['user_satisfaction_score'] = max(0, min(10, sample['user_satisfaction_score']))
        
        data.append(sample)
    
    # Add some anomalous samples
    for i in range(num_samples // 10):  # 10% anomalies
        anomaly = {
            'response_time': np.random.normal(5000, 1000),
            'error_rate': np.random.normal(15, 5),
            'cpu_usage': np.random.normal(85, 10),
            'memory_usage': np.random.normal(90, 5),
            'throughput': np.random.normal(100, 50),
            'db_response_time': np.random.normal(2000, 500),
            'active_users': np.random.poisson(50),
            'queue_length': np.random.poisson(80),
            'document_processing_success_rate': np.random.normal(80, 10),
            'user_satisfaction_score': np.random.normal(5, 1)
        }
        
        # Ensure bounds
        for key, value in anomaly.items():
            if key in ['cpu_usage', 'memory_usage']:
                anomaly[key] = max(0, min(100, value))
            elif key == 'error_rate':
                anomaly[key] = max(0, min(50, value))
            elif key == 'document_processing_success_rate':
                anomaly[key] = max(0, min(100, value))
            elif key == 'user_satisfaction_score':
                anomaly[key] = max(0, min(10, value))
            else:
                anomaly[key] = max(0, value)
        
        data.append(anomaly)
    
    return data

if __name__ == "__main__":
    # Example usage
    import os
    
    # Create necessary directories
    os.makedirs('models', exist_ok=True)
    os.makedirs('config', exist_ok=True)
    
    # Create default config
    default_config = {
        "contamination": 0.1,
        "random_state": 42,
        "n_estimators": 100,
        "feature_weights": {
            "response_time": 1.5,
            "error_rate": 2.0,
            "cpu_usage": 1.2,
            "memory_usage": 1.3,
            "throughput": 1.0,
            "db_response_time": 1.4,
            "active_users": 0.8,
            "queue_length": 1.1
        }
    }
    
    with open('config/anomaly_config.json', 'w') as f:
        json.dump(default_config, f, indent=2)
    
    # Initialize anomaly detector
    detector = AnomalyDetectionEngine()
    
    # Generate and train on sample data
    print("Generating sample training data...")
    training_data = generate_sample_data(1000)
    
    print("Training anomaly detection model...")
    detector.train_on_historical_data(training_data)
    
    # Test with normal and anomalous data
    normal_metrics = {
        'response_time': 850,
        'error_rate': 2.1,
        'cpu_usage': 45,
        'memory_usage': 65,
        'throughput': 480,
        'db_response_time': 220,
        'active_users': 195,
        'queue_length': 12,
        'document_processing_success_rate': 97.8,
        'user_satisfaction_score': 8.3
    }
    
    anomalous_metrics = {
        'response_time': 4500,
        'error_rate': 18.5,
        'cpu_usage': 92,
        'memory_usage': 88,
        'throughput': 85,
        'db_response_time': 3200,
        'active_users': 45,
        'queue_length': 95,
        'document_processing_success_rate': 75.2,
        'user_satisfaction_score': 4.1
    }
    
    print("\nTesting normal metrics:")
    normal_result = detector.detect_anomalies(normal_metrics)
    print(json.dumps(normal_result, indent=2))
    
    print("\nTesting anomalous metrics:")
    anomaly_result = detector.detect_anomalies(anomalous_metrics)
    print(json.dumps(anomaly_result, indent=2))