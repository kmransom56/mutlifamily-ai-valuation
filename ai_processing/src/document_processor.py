"""
Document processing module for multifamily property documents
Handles PDF and Excel parsing for rent rolls, T12 statements, and offering memorandums
"""

import os
import pandas as pd
import PyPDF2
import pdfplumber
from typing import Dict, List, Optional, Any, Union
import logging
import re
from pathlib import Path
import json
import asyncio
import aiofiles
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

class DocumentProcessor:
    """Processes various types of property documents"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.max_file_size_mb = config.get('processing', {}).get('max_file_size_mb', 50)
        self.enable_async = config.get('processing', {}).get('enable_async', True)
        self.max_workers = config.get('processing', {}).get('max_workers', 4)
        self.chunk_size = config.get('processing', {}).get('chunk_size', 1000)
        self.max_memory_mb = config.get('processing', {}).get('max_memory_mb', 512)
    
    def _chunk_text(self, text: str, chunk_size: Optional[int] = None) -> List[str]:
        """
        Split large text into manageable chunks for processing
        
        Args:
            text: Text to chunk
            chunk_size: Size of each chunk (defaults to config value)
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        chunk_size = chunk_size or self.chunk_size
        
        # If text is small, return as single chunk
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        # Split on paragraphs first, then sentences, then words
        paragraphs = text.split('\n\n')
        
        current_chunk = ""
        for paragraph in paragraphs:
            # If single paragraph is too large, split it further
            if len(paragraph) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # Split large paragraph by sentences
                sentences = paragraph.split('. ')
                for sentence in sentences:
                    if len(current_chunk + sentence) > chunk_size:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = sentence + '. '
                    else:
                        current_chunk += sentence + '. '
            else:
                # Check if adding this paragraph exceeds chunk size
                if len(current_chunk + paragraph) > chunk_size:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = paragraph + '\n\n'
                else:
                    current_chunk += paragraph + '\n\n'
        
        # Add remaining chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _process_large_pdf_memory_optimized(self, file_path: str) -> Dict[str, Any]:
        """
        Process large PDF files with memory optimization
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Processed document data
        """
        self.logger.info(f"Processing large PDF with memory optimization: {file_path}")
        
        text_chunks = []
        tables = []
        page_count = 0
        
        try:
            # Process PDF page by page to manage memory
            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)
                
                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Extract text from current page
                        page_text = page.extract_text() or ""
                        if page_text.strip():
                            # Chunk the page text if it's large
                            chunks = self._chunk_text(page_text)
                            text_chunks.extend(chunks)
                        
                        # Extract tables from current page
                        page_tables = page.extract_tables()
                        if page_tables:
                            tables.extend(page_tables)
                        
                        # Log progress for large documents
                        if page_count > 10 and (page_num + 1) % 10 == 0:
                            self.logger.info(f"Processed {page_num + 1}/{page_count} pages")
                    
                    except Exception as e:
                        self.logger.warning(f"Error processing page {page_num + 1}: {e}")
                        continue
            
            # Combine chunks with memory management
            full_text = self._combine_chunks_safely(text_chunks)
            
            return {
                'text': full_text,
                'tables': tables,
                'page_count': page_count,
                'chunks_processed': len(text_chunks),
                'memory_optimized': True
            }
            
        except Exception as e:
            self.logger.error(f"Error in memory-optimized PDF processing: {e}")
            raise
    
    def _combine_chunks_safely(self, chunks: List[str]) -> str:
        """
        Safely combine text chunks with memory monitoring
        
        Args:
            chunks: List of text chunks
            
        Returns:
            Combined text
        """
        if not chunks:
            return ""
        
        # For very large documents, sample key chunks instead of combining all
        if len(chunks) > 100:  # Arbitrary threshold
            self.logger.info(f"Large document with {len(chunks)} chunks, sampling key sections")
            # Take first few, middle few, and last few chunks
            selected_chunks = chunks[:10] + chunks[len(chunks)//2-5:len(chunks)//2+5] + chunks[-10:]
            return "\n\n".join(selected_chunks)
        
        return "\n\n".join(chunks)
    
    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """
        Validate file before processing
        
        Args:
            file_path: Path to the file to validate
            
        Returns:
            Dictionary with validation results
        """
        if not os.path.exists(file_path):
            return {'valid': False, 'error': 'File does not exist'}
        
        try:
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                return {
                    'valid': False, 
                    'error': f'File size ({file_size_mb:.1f}MB) exceeds maximum ({self.max_file_size_mb}MB)'
                }
            
            file_ext = Path(file_path).suffix.lower()
            allowed_extensions = ['.pdf', '.xlsx', '.xls', '.xlsb', '.xltx', '.csv']
            if file_ext not in allowed_extensions:
                return {
                    'valid': False,
                    'error': f'File type {file_ext} not supported. Allowed: {allowed_extensions}'
                }
            
            # Basic file integrity check
            if file_size_mb < 0.001:  # Less than 1KB
                return {'valid': False, 'error': 'File appears to be empty or corrupted'}
            
            return {
                'valid': True,
                'size_mb': file_size_mb,
                'extension': file_ext,
                'readable': os.access(file_path, os.R_OK)
            }
            
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}
    
    async def process_documents_async(self, file_paths: Dict[str, Optional[str]]) -> Dict[str, Any]:
        """
        Process documents asynchronously for better performance
        
        Args:
            file_paths: Dictionary of document types and their file paths
            
        Returns:
            Dictionary containing parsed data from all documents
        """
        start_time = time.time()
        
        results = {
            'rent_roll': None,
            't12': None,
            'offering_memo': None,
            'template': None,
            'metadata': {
                'files_processed': [],
                'processing_errors': [],
                'validation_errors': [],
                'processing_time_seconds': 0,
                'async_enabled': True
            }
        }
        
        # Validate all files first
        valid_files = {}
        for doc_type, file_path in file_paths.items():
            if file_path:
                validation = self.validate_file(file_path)
                if validation['valid']:
                    valid_files[doc_type] = file_path
                    self.logger.info(f"File validation passed for {doc_type}: {validation['size_mb']:.1f}MB")
                else:
                    error_msg = f"Validation failed for {doc_type}: {validation['error']}"
                    self.logger.error(error_msg)
                    results['metadata']['validation_errors'].append(error_msg)
        
        if not valid_files:
            results['metadata']['processing_time_seconds'] = time.time() - start_time
            return results
        
        # Process files concurrently
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_type = {}
            
            for doc_type, file_path in valid_files.items():
                if doc_type == 'rent_roll':
                    future = executor.submit(self.process_rent_roll, file_path)
                elif doc_type == 't12':
                    future = executor.submit(self.process_t12, file_path)
                elif doc_type == 'offering_memo':
                    future = executor.submit(self.process_offering_memo, file_path)
                elif doc_type == 'template':
                    future = executor.submit(self.process_template, file_path)
                else:
                    continue
                
                future_to_type[future] = doc_type
            
            # Collect results as they complete
            for future in as_completed(future_to_type):
                doc_type = future_to_type[future]
                try:
                    result = future.result()
                    results[doc_type] = result
                    results['metadata']['files_processed'].append(doc_type)
                    self.logger.info(f"{doc_type} processed successfully")
                except Exception as e:
                    error_msg = f"Error processing {doc_type}: {str(e)}"
                    self.logger.error(error_msg)
                    results['metadata']['processing_errors'].append(error_msg)
        
        results['metadata']['processing_time_seconds'] = time.time() - start_time
        return results
        
    def process_documents(self, file_paths: Dict[str, Optional[str]]) -> Dict[str, Any]:
        """
        Process all provided documents
        
        Args:
            file_paths: Dictionary of document types and their file paths
            
        Returns:
            Dictionary containing parsed data from all documents
        """
        
        # Use async processing if enabled and multiple files
        if (self.enable_async and 
            sum(1 for path in file_paths.values() if path) > 1):
            try:
                return asyncio.run(self.process_documents_async(file_paths))
            except Exception as e:
                self.logger.warning(f"Async processing failed, falling back to sync: {e}")
        
        # Fallback to synchronous processing
        start_time = time.time()
        results = {
            'rent_roll': None,
            't12': None,
            'offering_memo': None,
            'template': None,
            'metadata': {
                'files_processed': [],
                'processing_errors': [],
                'validation_errors': [],
                'processing_time_seconds': 0,
                'async_enabled': False
            }
        }
        
        # Process rent roll
        if file_paths.get('rent_roll'):
            validation = self.validate_file(file_paths['rent_roll'])
            if validation['valid']:
                try:
                    results['rent_roll'] = self.process_rent_roll(file_paths['rent_roll'])
                    results['metadata']['files_processed'].append('rent_roll')
                    self.logger.info("Rent roll processed successfully")
                except Exception as e:
                    error_msg = f"Error processing rent roll: {str(e)}"
                    self.logger.error(error_msg)
                    results['metadata']['processing_errors'].append(error_msg)
            else:
                error_msg = f"Validation failed for rent_roll: {validation['error']}"
                self.logger.error(error_msg)
                results['metadata']['validation_errors'].append(error_msg)
        
        # Process T12
        if file_paths.get('t12'):
            validation = self.validate_file(file_paths['t12'])
            if validation['valid']:
                try:
                    results['t12'] = self.process_t12(file_paths['t12'])
                    results['metadata']['files_processed'].append('t12')
                    self.logger.info("T12 statement processed successfully")
                except Exception as e:
                    error_msg = f"Error processing T12: {str(e)}"
                    self.logger.error(error_msg)
                    results['metadata']['processing_errors'].append(error_msg)
            else:
                error_msg = f"Validation failed for t12: {validation['error']}"
                self.logger.error(error_msg)
                results['metadata']['validation_errors'].append(error_msg)
        
        # Process offering memo
        if file_paths.get('offering_memo'):
            validation = self.validate_file(file_paths['offering_memo'])
            if validation['valid']:
                try:
                    results['offering_memo'] = self.process_offering_memo(file_paths['offering_memo'])
                    results['metadata']['files_processed'].append('offering_memo')
                    self.logger.info("Offering memorandum processed successfully")
                except Exception as e:
                    error_msg = f"Error processing offering memo: {str(e)}"
                    self.logger.error(error_msg)
                    results['metadata']['processing_errors'].append(error_msg)
            else:
                error_msg = f"Validation failed for offering_memo: {validation['error']}"
                self.logger.error(error_msg)
                results['metadata']['validation_errors'].append(error_msg)
        
        # Process template
        if file_paths.get('template'):
            validation = self.validate_file(file_paths['template'])
            if validation['valid']:
                try:
                    results['template'] = self.process_template(file_paths['template'])
                    results['metadata']['files_processed'].append('template')
                    self.logger.info("Template processed successfully")
                except Exception as e:
                    error_msg = f"Error processing template: {str(e)}"
                    self.logger.error(error_msg)
                    results['metadata']['processing_errors'].append(error_msg)
            else:
                error_msg = f"Validation failed for template: {validation['error']}"
                self.logger.error(error_msg)
                results['metadata']['validation_errors'].append(error_msg)
        
        results['metadata']['processing_time_seconds'] = time.time() - start_time
        return results
    
    def process_rent_roll(self, file_path: str) -> Dict[str, Any]:
        """Process rent roll document (PDF or Excel)"""
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self._process_rent_roll_pdf(file_path)
        elif file_ext in ['.xlsx', '.xls', '.xlsb', '.xltx']:
            return self._process_rent_roll_excel(file_path)
        else:
            raise ValueError(f"Unsupported rent roll format: {file_ext}")
    
    def _process_rent_roll_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF rent roll with memory optimization for large files"""
        
        # Check if file is large and use memory optimization
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > 10:  # Use memory optimization for files > 10MB
            pdf_data = self._process_large_pdf_memory_optimized(file_path)
            text_content = pdf_data['text']
            tables = pdf_data['tables']
            memory_optimized = True
        else:
            # Standard processing for smaller files
            with pdfplumber.open(file_path) as pdf:
                text_content = ""
                tables = []
                
                for page in pdf.pages:
                    # Extract text
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\\n"
                    
                    # Extract tables
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
            memory_optimized = False
        
        # Parse rent roll data
        units = self._parse_rent_roll_data(text_content, tables)
        
        result = {
            'type': 'rent_roll',
            'format': 'pdf',
            'raw_text': text_content,
            'tables': tables,
            'units': units,
            'summary': self._summarize_rent_roll(units),
            'memory_optimized': memory_optimized,
            'file_size_mb': file_size_mb
        }
        
        return result
    
    def _process_rent_roll_excel(self, file_path: str) -> Dict[str, Any]:
        """Process Excel rent roll"""
        
        # Read all sheets
        excel_data = pd.read_excel(file_path, sheet_name=None)
        
        # Find the main rent roll sheet
        rent_roll_sheet = None
        for sheet_name, df in excel_data.items():
            if self._is_rent_roll_sheet(df):
                rent_roll_sheet = df
                break
        
        if rent_roll_sheet is None:
            # Use the first sheet as fallback
            rent_roll_sheet = list(excel_data.values())[0]
        
        # Parse units data
        units = self._parse_excel_rent_roll(rent_roll_sheet)
        
        return {
            'type': 'rent_roll',
            'format': 'excel',
            'sheets': list(excel_data.keys()),
            'main_sheet': rent_roll_sheet.to_dict('records'),
            'units': units,
            'summary': self._summarize_rent_roll(units)
        }
    
    def _parse_rent_roll_data(self, text: str, tables: List[List[List[str]]]) -> List[Dict[str, Any]]:
        """Parse rent roll data from text and tables"""
        
        units = []
        
        # Try to extract from tables first
        for table in tables:
            if len(table) > 1:  # Has header row
                headers = [h.strip().lower() if h else '' for h in table[0]]
                
                # Look for key columns
                unit_col = self._find_column_index(headers, ['unit', 'apt', 'apartment', '#'])
                rent_col = self._find_column_index(headers, ['rent', 'current rent', 'monthly rent'])
                sqft_col = self._find_column_index(headers, ['sq ft', 'sqft', 'square feet', 'area'])
                bed_col = self._find_column_index(headers, ['bed', 'beds', 'bedroom', 'br'])
                bath_col = self._find_column_index(headers, ['bath', 'baths', 'bathroom', 'ba'])
                
                for row in table[1:]:
                    if len(row) > max(unit_col or 0, rent_col or 0):
                        unit_data = {
                            'unit': row[unit_col] if unit_col is not None and unit_col < len(row) else '',
                            'current_rent': self._parse_currency(row[rent_col] if rent_col is not None and rent_col < len(row) else ''),
                            'sqft': self._parse_number(row[sqft_col] if sqft_col is not None and sqft_col < len(row) else ''),
                            'bedrooms': self._parse_number(row[bed_col] if bed_col is not None and bed_col < len(row) else ''),
                            'bathrooms': self._parse_number(row[bath_col] if bath_col is not None and bath_col < len(row) else ''),
                            'status': 'occupied'  # Default assumption
                        }
                        
                        if unit_data['unit']:  # Only add if we have a unit number
                            units.append(unit_data)
        
        return units
    
    def _parse_excel_rent_roll(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Parse Excel rent roll DataFrame"""
        
        units = []
        
        # Normalize column names
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        # Find key columns
        unit_col = self._find_column_name(df.columns, ['unit', 'apt', 'apartment', '#'])
        rent_col = self._find_column_name(df.columns, ['rent', 'current rent', 'monthly rent'])
        sqft_col = self._find_column_name(df.columns, ['sq ft', 'sqft', 'square feet', 'area'])
        bed_col = self._find_column_name(df.columns, ['bed', 'beds', 'bedroom', 'br'])
        bath_col = self._find_column_name(df.columns, ['bath', 'baths', 'bathroom', 'ba'])
        
        for _, row in df.iterrows():
            unit_data = {
                'unit': str(row[unit_col]) if unit_col and pd.notna(row[unit_col]) else '',
                'current_rent': self._parse_currency(str(row[rent_col])) if rent_col and pd.notna(row[rent_col]) else 0,
                'sqft': self._parse_number(str(row[sqft_col])) if sqft_col and pd.notna(row[sqft_col]) else 0,
                'bedrooms': self._parse_number(str(row[bed_col])) if bed_col and pd.notna(row[bed_col]) else 0,
                'bathrooms': self._parse_number(str(row[bath_col])) if bath_col and pd.notna(row[bath_col]) else 0,
                'status': 'occupied'
            }
            
            if unit_data['unit']:
                units.append(unit_data)
        
        return units
    
    def process_t12(self, file_path: str) -> Dict[str, Any]:
        """Process T12 financial statement"""
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self._process_t12_pdf(file_path)
        elif file_ext in ['.xlsx', '.xls', '.xlsb', '.xltx']:
            return self._process_t12_excel(file_path)
        else:
            raise ValueError(f"Unsupported T12 format: {file_ext}")
    
    def _process_t12_excel(self, file_path: str) -> Dict[str, Any]:
        """Process Excel T12 statement"""
        
        excel_data = pd.read_excel(file_path, sheet_name=None)
        
        # Find financial data sheet
        main_sheet = None
        for sheet_name, df in excel_data.items():
            if self._is_financial_sheet(df):
                main_sheet = df
                break
        
        if main_sheet is None:
            main_sheet = list(excel_data.values())[0]
        
        # Extract financial data
        financial_data = self._parse_t12_data(main_sheet)
        
        return {
            'type': 't12',
            'format': 'excel',
            'sheets': list(excel_data.keys()),
            'financial_data': financial_data,
            'raw_data': main_sheet.to_dict('records')
        }
    
    def _process_t12_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF T12 statement"""
        
        with pdfplumber.open(file_path) as pdf:
            text_content = ""
            tables = []
            
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content += page_text + "\\n"
                
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)
        
        # Extract financial data
        financial_data = self._parse_t12_text(text_content, tables)
        
        return {
            'type': 't12',
            'format': 'pdf',
            'raw_text': text_content,
            'tables': tables,
            'financial_data': financial_data
        }
    
    def process_offering_memo(self, file_path: str) -> Dict[str, Any]:
        """Process offering memorandum PDF"""
        
        with pdfplumber.open(file_path) as pdf:
            text_content = ""
            tables = []
            
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content += page_text + "\\n"
                
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)
        
        # Extract key information
        property_info = self._extract_property_info(text_content)
        investment_highlights = self._extract_investment_highlights(text_content)
        
        return {
            'type': 'offering_memo',
            'format': 'pdf',
            'raw_text': text_content,
            'tables': tables,
            'property_info': property_info,
            'investment_highlights': investment_highlights
        }
    
    def process_template(self, file_path: str) -> Dict[str, Any]:
        """Process analysis template"""
        
        excel_data = pd.read_excel(file_path, sheet_name=None)
        
        return {
            'type': 'template',
            'format': 'excel',
            'sheets': {name: df.to_dict('records') for name, df in excel_data.items()},
            'structure': self._analyze_template_structure(excel_data)
        }
    
    # Helper methods
    
    def _find_column_index(self, headers: List[str], keywords: List[str]) -> Optional[int]:
        """Find column index by keywords"""
        for i, header in enumerate(headers):
            for keyword in keywords:
                if keyword in header:
                    return i
        return None
    
    def _find_column_name(self, columns: List[str], keywords: List[str]) -> Optional[str]:
        """Find column name by keywords"""
        for col in columns:
            for keyword in keywords:
                if keyword in col:
                    return col
        return None
    
    def _parse_currency(self, value: str) -> float:
        """Parse currency string to float"""
        if not value or pd.isna(value):
            return 0.0
        
        # Remove currency symbols and commas
        cleaned = re.sub(r'[$,]', '', str(value).strip())
        
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    
    def _parse_number(self, value: str) -> float:
        """Parse number string to float"""
        if not value or pd.isna(value):
            return 0.0
        
        try:
            return float(str(value).strip())
        except ValueError:
            return 0.0
    
    def _is_rent_roll_sheet(self, df: pd.DataFrame) -> bool:
        """Check if DataFrame is a rent roll sheet"""
        columns = [str(col).lower() for col in df.columns]
        rent_keywords = ['unit', 'rent', 'sqft', 'bedroom', 'apt']
        return sum(1 for keyword in rent_keywords if any(keyword in col for col in columns)) >= 2
    
    def _is_financial_sheet(self, df: pd.DataFrame) -> bool:
        """Check if DataFrame is a financial sheet"""
        columns = [str(col).lower() for col in df.columns]
        financial_keywords = ['income', 'expense', 'revenue', 'noi', 'month']
        return sum(1 for keyword in financial_keywords if any(keyword in col for col in columns)) >= 2
    
    def _summarize_rent_roll(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize rent roll data"""
        if not units:
            return {}
        
        total_units = len(units)
        total_rent = sum(unit.get('current_rent', 0) for unit in units)
        avg_rent = total_rent / total_units if total_units > 0 else 0
        total_sqft = sum(unit.get('sqft', 0) for unit in units)
        avg_sqft = total_sqft / total_units if total_units > 0 else 0
        
        return {
            'total_units': total_units,
            'total_monthly_rent': total_rent,
            'average_rent': avg_rent,
            'total_sqft': total_sqft,
            'average_sqft': avg_sqft,
            'rent_per_sqft': avg_rent / avg_sqft if avg_sqft > 0 else 0
        }
    
    def _parse_t12_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Parse T12 financial data from DataFrame"""
        # This is a simplified implementation
        # In practice, you'd need more sophisticated parsing
        
        financial_data = {
            'gross_income': 0,
            'operating_expenses': 0,
            'noi': 0,
            'monthly_data': []
        }
        
        # Look for income and expense patterns
        for _, row in df.iterrows():
            # Extract monthly financial data
            pass  # Implement based on specific T12 format
        
        return financial_data
    
    def _parse_t12_text(self, text: str, tables: List) -> Dict[str, Any]:
        """Parse T12 data from text content"""
        # Extract financial figures from text
        financial_data = {
            'gross_income': 0,
            'operating_expenses': 0,
            'noi': 0
        }
        
        # Use regex to find financial figures
        income_match = re.search(r'gross.*income.*?(\$?[\d,]+)', text, re.IGNORECASE)
        if income_match:
            financial_data['gross_income'] = self._parse_currency(income_match.group(1))
        
        return financial_data
    
    def _extract_property_info(self, text: str) -> Dict[str, Any]:
        """Extract property information from offering memo text"""
        
        property_info = {}
        
        # Extract property name
        name_patterns = [
            r'property.*?name.*?:.*?([\\n\\r]+)',
            r'([A-Z][a-z]+ [A-Z][a-z]+ (?:Apartments|Complex|Properties))'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                property_info['name'] = match.group(1).strip()
                break
        
        # Extract location
        location_patterns = [
            r'located.*?in.*?([A-Z][a-z]+,? [A-Z]{2})',
            r'address.*?:.*?([^\\n]+)'
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                property_info['location'] = match.group(1).strip()
                break
        
        return property_info
    
    def _extract_investment_highlights(self, text: str) -> List[str]:
        """Extract investment highlights from offering memo"""
        
        highlights = []
        
        # Look for bullet points or numbered lists
        highlight_patterns = [
            r'[•▪▫]\\s*([^\\n\\r]+)',
            r'\\d+\\.\\s*([^\\n\\r]+)',
            r'-\\s*([^\\n\\r]+)'
        ]
        
        for pattern in highlight_patterns:
            matches = re.findall(pattern, text)
            highlights.extend([match.strip() for match in matches])
        
        return highlights[:10]  # Limit to top 10
    
    def _analyze_template_structure(self, excel_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Analyze the structure of the analysis template"""
        
        structure = {
            'sheets': list(excel_data.keys()),
            'input_areas': {},
            'key_mappings': {},
            'template_type': 'rental_property_analysis'
        }
        
        # Define key input mappings for the Rental Property Analysis template
        structure['key_mappings'] = {
            'property_info': {
                'sheet': 'DASHBOARD',
                'mappings': {
                    'property_name': 'D9',
                    'property_address': 'D10', 
                    'property_city': 'D11',
                    'property_state': 'D12',
                    'property_zip': 'D13',
                    'total_units': 'D14',
                    'total_sqft': 'D15',
                    'year_built': 'D16',
                    'acquisition_price': 'D17'
                }
            },
            'unit_data': {
                'sheet': 'UNIT DATA',
                'start_row': 12,
                'columns': {
                    'unit_type': 'B',
                    'unit_count': 'C', 
                    'avg_sqft': 'D',
                    'market_rent': 'E',
                    'current_rent': 'F'
                }
            },
            'financial_inputs': {
                'sheet': 'MULTI-UNITS',
                'mappings': {
                    'annual_rent_increase': 'I9',
                    'vacancy_rate': 'I10',
                    'property_mgmt_fee': 'I11',
                    'capex_reserve': 'I12',
                    'operating_expenses': 'I13'
                }
            },
            'financing': {
                'sheet': 'DEBT',
                'mappings': {
                    'loan_amount': 'I9',
                    'interest_rate': 'I10',
                    'loan_term': 'I11',
                    'down_payment': 'I12'
                }
            }
        }
        
        # Analyze each key sheet
        for sheet_name, df in excel_data.items():
            if sheet_name in ['DASHBOARD', 'MULTI-UNITS', 'UNIT DATA', 'FORECASTS', 'SUMMARY']:
                structure['input_areas'][sheet_name] = {
                    'rows': df.shape[0],
                    'columns': df.shape[1],
                    'has_data': df.count().sum() > 0
                }
        
        return structure