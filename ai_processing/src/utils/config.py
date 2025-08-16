"""
Configuration management for the AI processing system
"""

import os
import json
from typing import Dict, Any, Optional
from pathlib import Path

def load_config(config_path: str) -> Dict[str, Any]:
    """
    Load configuration from JSON file with environment variable overrides
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Configuration dictionary
    """
    
    # Default configuration
    default_config = {
        "openai_api_key": os.getenv("OPENAI_API_KEY"),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "financial_assumptions": {
            "hold_period": int(os.getenv("HOLD_PERIOD", "5")),
            "exit_cap_rate": float(os.getenv("EXIT_CAP_RATE", "0.065")),
            "annual_rent_growth": float(os.getenv("ANNUAL_RENT_GROWTH", "0.03")),
            "annual_expense_growth": float(os.getenv("ANNUAL_EXPENSE_GROWTH", "0.025")),
            "vacancy_rate": float(os.getenv("VACANCY_RATE", "0.05")),
            "management_fee": float(os.getenv("MANAGEMENT_FEE", "0.05")),
            "capital_reserve": float(os.getenv("CAPITAL_RESERVE", "0.02")),
            "discount_rate": float(os.getenv("DISCOUNT_RATE", "0.10"))
        },
        "processing": {
            "max_file_size_mb": int(os.getenv("MAX_FILE_SIZE_MB", "50")),
            "timeout_seconds": int(os.getenv("TIMEOUT_SECONDS", "300")),
            "temp_dir": os.getenv("TEMP_DIR", "/tmp/multifamily_processing")
        }
    }
    
    # Load from file if it exists
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                file_config = json.load(f)
                # Merge with defaults
                config = {**default_config, **file_config}
        except Exception as e:
            print(f"Warning: Could not load config file {config_path}: {e}")
            config = default_config
    else:
        config = default_config
    
    # Environment variable overrides
    if os.getenv("OPENAI_API_KEY"):
        config["openai_api_key"] = os.getenv("OPENAI_API_KEY")
    
    return config

def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validate configuration parameters
    
    Args:
        config: Configuration dictionary
        
    Returns:
        True if config is valid
    """
    
    # Check required fields
    if not config.get("openai_api_key"):
        print("Warning: OpenAI API key not configured. AI analysis will use fallback methods.")
    
    # Validate financial assumptions
    financial = config.get("financial_assumptions", {})
    
    if financial.get("hold_period", 0) <= 0:
        print("Error: Hold period must be positive")
        return False
    
    if not (0 < financial.get("exit_cap_rate", 0) < 1):
        print("Error: Exit cap rate must be between 0 and 1")
        return False
    
    return True

def save_config(config: Dict[str, Any], config_path: str) -> None:
    """
    Save configuration to JSON file
    
    Args:
        config: Configuration dictionary
        config_path: Path to save configuration
    """
    
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

def get_default_config_path() -> str:
    """
    Get default configuration file path
    
    Returns:
        Path to default config file
    """
    return os.path.join(
        os.path.dirname(os.path.dirname(__file__)), 
        "config.json"
    )