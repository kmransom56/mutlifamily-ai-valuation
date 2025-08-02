#!/usr/bin/env python3
"""
Multifamily AI Property Analysis System
Main processing pipeline for analyzing property documents
"""

import sys
import os
import argparse
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

# Add the src directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from document_processor import DocumentProcessor
from ai_analyzer import AIAnalyzer
from financial_modeler import FinancialModeler
from report_generator import ReportGenerator
from utils.logger import setup_logger, create_processing_monitor
from utils.config import load_config

class MultifamilyProcessor:
    """Main processor for multifamily property analysis"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = setup_logger(__name__)
        
        # Initialize components
        self.document_processor = DocumentProcessor(config)
        self.ai_analyzer = AIAnalyzer(config)
        self.financial_modeler = FinancialModeler(config)
        self.report_generator = ReportGenerator(config)
        
    def process_property(self, 
                        rent_roll_path: Optional[str] = None,
                        t12_path: Optional[str] = None,
                        offering_memo_path: Optional[str] = None,
                        template_path: Optional[str] = None,
                        output_dir: str = "output",
                        job_id: str = "default",
                        property_id: Optional[str] = None,
                        generate_pitch_deck: bool = True,
                        include_analysis: bool = True) -> Dict[str, Any]:
        """
        Process multifamily property documents and generate analysis
        
        Args:
            rent_roll_path: Path to rent roll document
            t12_path: Path to T12 financial statement
            offering_memo_path: Path to offering memorandum
            template_path: Path to analysis template
            output_dir: Directory to save results
            job_id: Unique job identifier
            property_id: Property identifier
            generate_pitch_deck: Whether to generate pitch deck
            include_analysis: Whether to include detailed analysis
            
        Returns:
            Dictionary containing processing results
        """
        
        self.logger.info(f"Starting property analysis for job {job_id}")
        
        with create_processing_monitor(job_id, os.path.join(output_dir, "logs")) as monitor:
            try:
                # Step 1: Document Processing
                with monitor.track_operation("document_processing", file_count=len([p for p in [rent_roll_path, t12_path, offering_memo_path, template_path] if p])):
                    self.logger.info("Step 1: Processing documents...")
                    documents = self.document_processor.process_documents({
                        'rent_roll': rent_roll_path,
                        't12': t12_path,
                        'offering_memo': offering_memo_path,
                        'template': template_path
                    })
                    
                    # Track file processing results
                    for doc_type, file_path in [('rent_roll', rent_roll_path), ('t12', t12_path), ('offering_memo', offering_memo_path), ('template', template_path)]:
                        if file_path:
                            success = documents.get(doc_type) is not None
                            monitor.track_file_processing(file_path, doc_type, success)
                
                # Step 2: AI Analysis
                with monitor.track_operation("ai_analysis", ai_enabled=hasattr(self.ai_analyzer, 'openai_available') and self.ai_analyzer.openai_available):
                    self.logger.info("Step 2: Running AI analysis...")
                    ai_insights = self.ai_analyzer.analyze_documents(documents)
                
                # Step 3: Financial Modeling
                with monitor.track_operation("financial_modeling"):
                    self.logger.info("Step 3: Building financial models...")
                    financial_analysis = self.financial_modeler.create_models(
                        documents, ai_insights
                    )
                
                # Step 4: Generate Reports
                with monitor.track_operation("report_generation", generate_pitch_deck=generate_pitch_deck):
                    self.logger.info("Step 4: Generating reports...")
                    reports = self.report_generator.generate_reports(
                        documents=documents,
                        ai_insights=ai_insights,
                        financial_analysis=financial_analysis,
                        output_dir=output_dir,
                        job_id=job_id,
                        generate_pitch_deck=generate_pitch_deck,
                        include_analysis=include_analysis
                    )
            
                # Compile results
                results = {
                    'job_id': job_id,
                    'property_id': property_id,
                    'status': 'completed',
                    'processed_at': datetime.now().isoformat(),
                    'documents_processed': len([p for p in [rent_roll_path, t12_path, offering_memo_path, template_path] if p]),
                    'ai_insights': ai_insights,
                    'financial_analysis': financial_analysis,
                    'reports_generated': reports,
                    'output_directory': output_dir,
                    'monitoring_report': monitor.generate_report()
                }
                
                # Save results summary
                results_path = os.path.join(output_dir, 'processing_results.json')
                with open(results_path, 'w') as f:
                    json.dump(results, f, indent=2, default=str)
                
                self.logger.info(f"Property analysis completed successfully for job {job_id}")
                return results
            
            except Exception as e:
                self.logger.error(f"Error processing property: {str(e)}")
                error_result = {
                    'job_id': job_id,
                    'status': 'failed',
                    'error': str(e),
                    'processed_at': datetime.now().isoformat()
                }
                
                # Save error details
                error_path = os.path.join(output_dir, 'error_details.json')
                os.makedirs(output_dir, exist_ok=True)
                with open(error_path, 'w') as f:
                    json.dump(error_result, f, indent=2)
                    
                raise e

def main():
    """Main entry point for command line execution"""
    
    parser = argparse.ArgumentParser(description='Multifamily Property AI Analysis')
    parser.add_argument('--rent-roll', type=str, help='Path to rent roll document')
    parser.add_argument('--t12', type=str, help='Path to T12 financial statement')
    parser.add_argument('--om', type=str, help='Path to offering memorandum')
    parser.add_argument('--template', type=str, help='Path to analysis template')
    parser.add_argument('--output-dir', type=str, required=True, help='Output directory')
    parser.add_argument('--job-id', type=str, required=True, help='Job ID')
    parser.add_argument('--property-id', type=str, help='Property ID')
    parser.add_argument('--generate-pitch-deck', action='store_true', help='Generate pitch deck')
    parser.add_argument('--include-analysis', action='store_true', help='Include detailed analysis')
    parser.add_argument('--config', type=str, default='config.json', help='Configuration file path')
    
    args = parser.parse_args()
    
    # Load configuration
    config_path = os.path.join(os.path.dirname(__file__), '..', args.config)
    config = load_config(config_path)
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Initialize processor
    processor = MultifamilyProcessor(config)
    
    try:
        # Process the property
        results = processor.process_property(
            rent_roll_path=args.rent_roll,
            t12_path=args.t12,
            offering_memo_path=args.om,
            template_path=args.template,
            output_dir=args.output_dir,
            job_id=args.job_id,
            property_id=args.property_id,
            generate_pitch_deck=args.generate_pitch_deck,
            include_analysis=args.include_analysis
        )
        
        print(f"✅ Processing completed successfully!")
        print(f"📁 Results saved to: {args.output_dir}")
        print(f"📊 Reports generated: {len(results.get('reports_generated', []))}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Processing failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())