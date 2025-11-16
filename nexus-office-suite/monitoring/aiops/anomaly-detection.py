#!/usr/bin/env python3
"""
AIOps Anomaly Detection for NEXUS Office Suite
Uses ML to detect anomalies in metrics and predict issues
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import requests
import json
from datetime import datetime, timedelta
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NEXUSAnomalyDetector:
    """ML-based anomaly detection for NEXUS metrics"""

    def __init__(self, prometheus_url='http://prometheus:9090'):
        self.prometheus_url = prometheus_url
        self.scaler = StandardScaler()
        self.models = {}

    def query_prometheus(self, query, start_time, end_time, step='15s'):
        """Query Prometheus for metrics"""
        url = f"{self.prometheus_url}/api/v1/query_range"
        params = {
            'query': query,
            'start': start_time.timestamp(),
            'end': end_time.timestamp(),
            'step': step
        }

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data['status'] == 'success':
                return data['data']['result']
            else:
                logger.error(f"Prometheus query failed: {data}")
                return []
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return []

    def extract_metrics(self, query_result):
        """Extract metrics from Prometheus query result"""
        if not query_result:
            return pd.DataFrame()

        all_data = []
        for result in query_result:
            values = result['values']
            df = pd.DataFrame(values, columns=['timestamp', 'value'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
            df['value'] = pd.to_numeric(df['value'])

            # Add labels as columns
            for label, value in result['metric'].items():
                df[label] = value

            all_data.append(df)

        if all_data:
            return pd.concat(all_data, ignore_index=True)
        return pd.DataFrame()

    def train_model(self, metric_name, data):
        """Train anomaly detection model for a specific metric"""
        if data.empty or len(data) < 100:
            logger.warning(f"Insufficient data for {metric_name}")
            return None

        # Prepare features
        features = data[['value']].values

        # Scale features
        scaled_features = self.scaler.fit_transform(features)

        # Train Isolation Forest
        model = IsolationForest(
            contamination=0.05,  # 5% expected anomalies
            random_state=42,
            n_estimators=100
        )
        model.fit(scaled_features)

        self.models[metric_name] = {
            'model': model,
            'scaler': self.scaler,
            'trained_at': datetime.now()
        }

        logger.info(f"Trained model for {metric_name}")
        return model

    def detect_anomalies(self, metric_name, data):
        """Detect anomalies in metric data"""
        if metric_name not in self.models:
            logger.warning(f"No model for {metric_name}, training new model")
            self.train_model(metric_name, data)

        if metric_name not in self.models:
            return []

        model_info = self.models[metric_name]
        model = model_info['model']
        scaler = model_info['scaler']

        # Prepare features
        features = data[['value']].values
        scaled_features = scaler.transform(features)

        # Predict anomalies (-1 = anomaly, 1 = normal)
        predictions = model.predict(scaled_features)

        # Get anomaly scores
        scores = model.score_samples(scaled_features)

        # Find anomalies
        anomalies = []
        for idx, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:
                anomalies.append({
                    'timestamp': data.iloc[idx]['timestamp'],
                    'value': data.iloc[idx]['value'],
                    'anomaly_score': float(score),
                    'severity': 'high' if score < -0.5 else 'medium'
                })

        return anomalies

    def send_alert(self, anomaly, metric_name):
        """Send alert for detected anomaly"""
        alert = {
            'timestamp': anomaly['timestamp'].isoformat(),
            'metric': metric_name,
            'value': anomaly['value'],
            'anomaly_score': anomaly['anomaly_score'],
            'severity': anomaly['severity'],
            'message': f"Anomaly detected in {metric_name}: {anomaly['value']}"
        }

        logger.warning(f"ANOMALY DETECTED: {json.dumps(alert, indent=2)}")

        # Send to AlertManager
        try:
            alertmanager_url = "http://alertmanager:9093/api/v1/alerts"
            alertmanager_payload = [{
                'labels': {
                    'alertname': 'MetricAnomaly',
                    'metric': metric_name,
                    'severity': anomaly['severity'],
                    'source': 'aiops'
                },
                'annotations': {
                    'summary': f"Anomaly in {metric_name}",
                    'description': alert['message'],
                    'value': str(anomaly['value']),
                    'score': str(anomaly['anomaly_score'])
                },
                'startsAt': alert['timestamp']
            }]

            requests.post(alertmanager_url, json=alertmanager_payload)
        except Exception as e:
            logger.error(f"Error sending alert: {e}")

    def monitor_metrics(self):
        """Continuously monitor metrics for anomalies"""
        # Metrics to monitor
        metrics = {
            'cpu_usage': 'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100',
            'memory_usage': '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
            'response_time': 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            'error_rate': 'rate(http_requests_total{status=~"5.."}[5m])',
            'database_connections': 'pg_stat_database_numbackends',
        }

        while True:
            try:
                end_time = datetime.now()
                start_time = end_time - timedelta(hours=1)

                for metric_name, query in metrics.items():
                    logger.info(f"Checking {metric_name}...")

                    # Query metrics
                    result = self.query_prometheus(query, start_time, end_time)
                    df = self.extract_metrics(result)

                    if df.empty:
                        logger.warning(f"No data for {metric_name}")
                        continue

                    # Train or update model
                    if metric_name not in self.models or \
                       (datetime.now() - self.models[metric_name]['trained_at']).days > 1:
                        self.train_model(metric_name, df)

                    # Detect anomalies
                    anomalies = self.detect_anomalies(metric_name, df)

                    # Send alerts
                    for anomaly in anomalies:
                        self.send_alert(anomaly, metric_name)

                    logger.info(f"{metric_name}: {len(anomalies)} anomalies detected")

                # Wait before next check
                time.sleep(60)

            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(60)


def main():
    """Main entry point"""
    logger.info("Starting NEXUS AIOps Anomaly Detection")

    detector = NEXUSAnomalyDetector()
    detector.monitor_metrics()


if __name__ == '__main__':
    main()
