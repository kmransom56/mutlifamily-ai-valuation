"""
Logging configuration for the AI processing system
Enhanced with monitoring and failure tracking
"""

import logging
import os
import json
import traceback
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

def setup_logger(name: str, log_level: str = "INFO", log_file: Optional[str] = None) -> logging.Logger:
    """
    Set up a logger with consistent formatting
    
    Args:
        name: Logger name
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        
    Returns:
        Configured logger instance
    """
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level.upper()))
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(getattr(logging, log_level.upper()))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def get_log_file_path(job_id: str, output_dir: str = "logs") -> str:
    """
    Generate a log file path for a specific job
    
    Args:
        job_id: Unique job identifier
        output_dir: Directory to store log files
        
    Returns:
        Path to log file
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{job_id}_{timestamp}.log"
    return os.path.join(output_dir, filename)

class ProcessingMonitor:
    """Monitor AI processing operations and track failures"""
    
    def __init__(self, job_id: str, output_dir: str = "logs"):
        self.job_id = job_id
        self.output_dir = output_dir
        self.start_time = datetime.now()
        self.failures: List[Dict[str, Any]] = []
        self.metrics: Dict[str, Any] = {
            'files_processed': 0,
            'files_failed': 0,
            'ai_calls_made': 0,
            'ai_calls_failed': 0,
            'memory_peaks': [],
            'processing_times': {}
        }
        self.logger = setup_logger(f"monitor_{job_id}")
        
        # Ensure monitoring directory exists
        os.makedirs(output_dir, exist_ok=True)
    
    @contextmanager
    def track_operation(self, operation_name: str, **kwargs):
        """Context manager to track individual operations"""
        op_start = datetime.now()
        self.logger.info(f"Starting operation: {operation_name}")
        
        try:
            yield self
            op_duration = (datetime.now() - op_start).total_seconds()
            self.metrics['processing_times'][operation_name] = op_duration
            self.logger.info(f"Operation {operation_name} completed in {op_duration:.2f}s")
            
        except Exception as e:
            op_duration = (datetime.now() - op_start).total_seconds()
            error_detail = {
                'operation': operation_name,
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc(),
                'timestamp': datetime.now().isoformat(),
                'duration_seconds': op_duration,
                'context': kwargs
            }
            
            self.failures.append(error_detail)
            self.logger.error(f"Operation {operation_name} failed after {op_duration:.2f}s: {str(e)}")
            self._log_failure_details(error_detail)
            raise
    
    def track_file_processing(self, file_path: str, file_type: str, success: bool = True):
        """Track file processing results"""
        if success:
            self.metrics['files_processed'] += 1
            self.logger.info(f"Successfully processed {file_type}: {file_path}")
        else:
            self.metrics['files_failed'] += 1
            self.logger.error(f"Failed to process {file_type}: {file_path}")
    
    def track_ai_call(self, model: str, success: bool = True, tokens_used: int = 0):
        """Track AI API calls"""
        self.metrics['ai_calls_made'] += 1
        if not success:
            self.metrics['ai_calls_failed'] += 1
            self.logger.warning(f"AI call failed for model: {model}")
        else:
            self.logger.debug(f"AI call successful for model: {model}, tokens: {tokens_used}")
    
    def track_memory_usage(self, memory_mb: float, operation: str):
        """Track memory usage peaks"""
        self.metrics['memory_peaks'].append({
            'operation': operation,
            'memory_mb': memory_mb,
            'timestamp': datetime.now().isoformat()
        })
        
        if memory_mb > 500:  # Alert on high memory usage
            self.logger.warning(f"High memory usage detected: {memory_mb:.1f}MB during {operation}")
    
    def _log_failure_details(self, error_detail: Dict[str, Any]):
        """Log detailed failure information"""
        failure_file = os.path.join(self.output_dir, f"failure_{self.job_id}_{len(self.failures)}.json")
        try:
            with open(failure_file, 'w') as f:
                json.dump(error_detail, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to write failure log: {e}")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive monitoring report"""
        total_duration = (datetime.now() - self.start_time).total_seconds()
        
        report = {
            'job_id': self.job_id,
            'start_time': self.start_time.isoformat(),
            'total_duration_seconds': total_duration,
            'success_rate': self._calculate_success_rate(),
            'metrics': self.metrics,
            'failures': self.failures,
            'recommendations': self._generate_recommendations()
        }
        
        # Save report
        report_file = os.path.join(self.output_dir, f"monitoring_report_{self.job_id}.json")
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"Monitoring report saved: {report_file}")
        except Exception as e:
            self.logger.error(f"Failed to save monitoring report: {e}")
        
        return report
    
    def _calculate_success_rate(self) -> float:
        """Calculate overall success rate"""
        total_operations = self.metrics['files_processed'] + self.metrics['files_failed']
        if total_operations == 0:
            return 1.0
        return self.metrics['files_processed'] / total_operations
    
    def _generate_recommendations(self) -> List[str]:
        """Generate optimization recommendations based on metrics"""
        recommendations = []
        
        # AI failure rate check
        ai_failure_rate = (self.metrics['ai_calls_failed'] / max(1, self.metrics['ai_calls_made']))
        if ai_failure_rate > 0.1:
            recommendations.append(f"High AI failure rate ({ai_failure_rate:.1%}). Consider API key validation or rate limiting.")
        
        # Memory usage check
        if self.metrics['memory_peaks']:
            max_memory = max(peak['memory_mb'] for peak in self.metrics['memory_peaks'])
            if max_memory > 1000:
                recommendations.append(f"High memory usage detected ({max_memory:.1f}MB). Consider implementing chunking.")
        
        # Processing time check
        if self.metrics['processing_times']:
            slow_operations = {op: time for op, time in self.metrics['processing_times'].items() if time > 30}
            if slow_operations:
                recommendations.append(f"Slow operations detected: {list(slow_operations.keys())}. Consider optimization.")
        
        # File failure check
        if self.metrics['files_failed'] > 0:
            recommendations.append("File processing failures detected. Check file formats and validation.")
        
        return recommendations

@contextmanager
def create_processing_monitor(job_id: str, output_dir: str = "logs"):
    """Context manager to create and finalize processing monitor"""
    monitor = ProcessingMonitor(job_id, output_dir)
    try:
        yield monitor
    finally:
        report = monitor.generate_report()
        monitor.logger.info(f"Processing completed with {len(monitor.failures)} failures")