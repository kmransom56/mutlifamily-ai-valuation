# AI Processing System

This directory contains the Python-based AI processing system for analyzing multifamily property documents and generating comprehensive reports.

## 🧠 Overview

The AI processing system is designed to analyze multifamily real estate documents and generate professional investment reports. It combines document parsing, AI analysis, financial modeling, and report generation into a comprehensive pipeline.

## 🏗️ Architecture

### Processing Pipeline

1. **Document Processing** (`document_processor.py`)
   - PDF parsing using pdfplumber and PyPDF2
   - Excel parsing with pandas and openpyxl
   - Intelligent data extraction from rent rolls, T12 statements, and offering memos

2. **AI Analysis** (`ai_analyzer.py`)
   - OpenAI integration for document insights
   - Unit mix and rent pattern analysis
   - Occupancy and financial performance analysis
   - Risk assessment and investment grading

3. **Financial Modeling** (`financial_modeler.py`)
   - Multi-year investment projections
   - Cash flow analysis with growth assumptions
   - Returns analysis (cap rates, NOI, appreciation)
   - Sensitivity analysis for key variables

4. **Report Generation** (`report_generator.py`)
   - Excel workbooks with financial models and charts
   - PDF executive summary reports
   - PowerPoint pitch decks for investors
   - JSON data exports

## 🚀 Quick Start

### Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

1. **Basic Configuration**
   ```bash
   # Copy and edit configuration
   cp config.json config.local.json
   ```

2. **Environment Variables**
   ```bash
   export OPENAI_API_KEY=your-openai-api-key
   ```

3. **Test Installation**
   ```bash
   python3 src/main.py --help
   ```

## 📖 Usage

### Command Line Interface

```bash
python3 src/main.py --rent-roll path/to/rent_roll.xlsx \
                    --t12 path/to/t12.pdf \
                    --om path/to/offering_memo.pdf \
                    --output-dir /path/to/output \
                    --job-id unique-job-id \
                    --generate-pitch-deck \
                    --include-analysis
```

### Parameters

- `--rent-roll`: Path to rent roll document (PDF or Excel)
- `--t12`: Path to T12 financial statement (PDF or Excel)  
- `--om`: Path to offering memorandum (PDF)
- `--template`: Path to analysis template (Excel)
- `--output-dir`: Directory to save generated reports
- `--job-id`: Unique identifier for the processing job
- `--property-id`: Optional property identifier
- `--generate-pitch-deck`: Generate PowerPoint presentation
- `--include-analysis`: Include detailed Excel analysis
- `--config`: Path to configuration file (default: config.json)

### Web Integration

The system is automatically invoked by the Next.js application when documents are uploaded through the web interface. The main API endpoint (`/api/process`) calls the Python system and manages job status.

## 📊 Generated Reports

### Standard Outputs

1. **integratedData.json**
   - Complete analysis results in JSON format
   - Property summary and financial metrics
   - AI insights and recommendations

2. **populatedTemplate.xlsx**
   - Detailed Excel workbook with financial models
   - Multi-year projections and cash flow analysis
   - Unit analysis and rent roll data
   - Returns analysis and sensitivity scenarios

3. **analysisReport.pdf**
   - Executive summary report
   - Property overview and key metrics
   - Investment highlights and recommendations

4. **pitchDeck.pptx**
   - Professional PowerPoint presentation
   - Investor-ready slides with key metrics
   - Market analysis and investment thesis

5. **processing_results.json**
   - Processing metadata and job status
   - File paths and generation timestamps
   - Error details if processing fails

## ⚙️ Configuration

### Financial Assumptions (`config.json`)

```json
{
  "financial_assumptions": {
    "hold_period": 5,
    "exit_cap_rate": 0.065,
    "annual_rent_growth": 0.03,
    "annual_expense_growth": 0.025,
    "vacancy_rate": 0.05,
    "management_fee": 0.05,
    "capital_reserve": 0.02,
    "discount_rate": 0.10
  },
  "processing": {
    "max_file_size_mb": 50,
    "timeout_seconds": 300,
    "temp_dir": "/tmp/multifamily_processing"
  }
}
```

### Environment Variables

- `OPENAI_API_KEY`: Required for AI analysis features
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `TEMP_DIR`: Temporary directory for processing files

## 🔧 Development

### Project Structure

```
src/
├── main.py                 # Entry point and CLI
├── document_processor.py   # Document parsing and extraction
├── ai_analyzer.py         # AI analysis and insights
├── financial_modeler.py   # Financial modeling and projections
├── report_generator.py    # Multi-format report generation
└── utils/
    ├── logger.py          # Logging configuration
    ├── config.py          # Configuration management
    └── __init__.py
```

### Adding New Features

1. **Document Types**: Extend `document_processor.py` with new parsers
2. **Analysis Models**: Add analysis methods to `ai_analyzer.py`
3. **Financial Calculations**: Extend `financial_modeler.py` with new models
4. **Report Formats**: Add generators to `report_generator.py`

### Testing

```bash
# Test with sample data
python3 src/main.py --output-dir /tmp/test_output --job-id test-123

# Check generated files
ls -la /tmp/test_output/
```

## 📦 Dependencies

### Core Libraries

- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computing
- **PyPDF2**: PDF parsing
- **pdfplumber**: Advanced PDF text extraction
- **openpyxl**: Excel file handling

### AI & NLP (Optional)

- **openai**: OpenAI API integration
- **langchain**: LLM framework
- **spacy**: Natural language processing
- **faiss-cpu**: Vector similarity search

### Report Generation

- **reportlab**: PDF generation
- **python-pptx**: PowerPoint generation
- **xlsxwriter**: Advanced Excel formatting

## 🚨 Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Ensure virtual environment is activated
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Missing Dependencies**
   ```bash
   # Install specific packages
   pip install package-name
   ```

3. **OpenAI API Issues**
   ```bash
   # Check API key
   echo $OPENAI_API_KEY
   
   # Test API connection
   python3 -c "import openai; print('OpenAI module loaded')"
   ```

4. **File Processing Errors**
   - Check file formats (PDF, Excel supported)
   - Verify file permissions and paths
   - Review log files for detailed errors

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python3 src/main.py --config config.json [other options]
```

## 🤝 Contributing

1. Follow Python PEP 8 style guidelines
2. Add docstrings to all functions and classes
3. Include type hints where appropriate
4. Write unit tests for new features
5. Update documentation for changes

## 📄 License

This AI processing system is part of the Multifamily AI Valuation Application and is licensed under the same MIT License.