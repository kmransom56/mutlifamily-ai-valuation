"""
AI Analysis Engine for Multifamily Property Documents
Uses natural language processing and machine learning for document analysis
"""

import os
import json
import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import numpy as np
import hashlib
import pickle

try:
    import openai
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
    from langchain_community.vectorstores import FAISS
    from langchain.chains import RetrievalQA
    OPENAI_AVAILABLE = True
except ImportError as e:
    OPENAI_AVAILABLE = False
    logging.warning(f"OpenAI/LangChain not available: {e}. Using fallback analysis.")

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logging.warning("spaCy not available. Using basic text analysis.")

class AIAnalyzer:
    """AI-powered analysis of property documents"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize AI components if available
        self.openai_available = OPENAI_AVAILABLE and config.get('openai_api_key')
        self.spacy_available = SPACY_AVAILABLE
        
        # Caching configuration
        self.cache_enabled = config.get('processing', {}).get('enable_caching', True)
        self.cache_ttl_hours = config.get('processing', {}).get('cache_ttl_hours', 24)
        self.cache_dir = config.get('processing', {}).get('cache_dir', '.cache')
        
        if self.cache_enabled:
            os.makedirs(self.cache_dir, exist_ok=True)
        
        if self.openai_available:
            api_key = config.get('openai_api_key')
            if api_key:
                self.client = openai.OpenAI(api_key=api_key)
                self.embeddings = OpenAIEmbeddings(api_key=api_key)
                self.llm = ChatOpenAI(temperature=0.1, api_key=api_key, model="gpt-3.5-turbo")
            else:
                self.openai_available = False
                self.logger.warning("OpenAI API key not provided in config")
        
        if self.spacy_available:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                self.spacy_available = False
                self.logger.warning("spaCy English model not found. Using basic analysis.")
    
    def _generate_cache_key(self, data: Any) -> str:
        """Generate a unique cache key for the given data"""
        def json_serializer(obj):
            """Custom JSON serializer for datetime and other objects"""
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            return str(obj)
        
        # Create a string representation of the data
        data_str = json.dumps(data, sort_keys=True, default=json_serializer)
        # Generate hash
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def _get_cache_file_path(self, cache_key: str) -> str:
        """Get the file path for a cache key"""
        return os.path.join(self.cache_dir, f"{cache_key}.cache")
    
    def _is_cache_valid(self, cache_file: str) -> bool:
        """Check if cache file is still valid based on TTL"""
        if not os.path.exists(cache_file):
            return False
        
        # Check file age
        file_age_hours = (datetime.now().timestamp() - os.path.getmtime(cache_file)) / 3600
        return file_age_hours < self.cache_ttl_hours
    
    def _load_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Load analysis results from cache"""
        if not self.cache_enabled:
            return None
        
        cache_file = self._get_cache_file_path(cache_key)
        
        if self._is_cache_valid(cache_file):
            try:
                with open(cache_file, 'rb') as f:
                    cached_data = pickle.load(f)
                self.logger.info(f"Loaded analysis from cache: {cache_key[:8]}...")
                return cached_data
            except Exception as e:
                self.logger.warning(f"Failed to load cache: {e}")
                # Remove corrupted cache file
                try:
                    os.remove(cache_file)
                except:
                    pass
        
        return None
    
    def _save_to_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """Save analysis results to cache"""
        if not self.cache_enabled:
            return
        
        cache_file = self._get_cache_file_path(cache_key)
        
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(data, f)
            self.logger.info(f"Saved analysis to cache: {cache_key[:8]}...")
        except Exception as e:
            self.logger.warning(f"Failed to save to cache: {e}")
    
    def _clean_old_cache(self) -> None:
        """Clean up old cache files"""
        if not self.cache_enabled or not os.path.exists(self.cache_dir):
            return
        
        try:
            current_time = datetime.now().timestamp()
            cleaned_count = 0
            
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.cache'):
                    file_path = os.path.join(self.cache_dir, filename)
                    file_age_hours = (current_time - os.path.getmtime(file_path)) / 3600
                    
                    if file_age_hours > self.cache_ttl_hours:
                        os.remove(file_path)
                        cleaned_count += 1
            
            if cleaned_count > 0:
                self.logger.info(f"Cleaned {cleaned_count} old cache files")
                
        except Exception as e:
            self.logger.warning(f"Failed to clean cache: {e}")
    
    def analyze_documents(self, documents: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform comprehensive AI analysis on all documents
        
        Args:
            documents: Parsed document data from DocumentProcessor
            
        Returns:
            Dictionary containing AI insights and analysis
        """
        
        # Clean old cache files first
        self._clean_old_cache()
        
        # Check if we have cached results
        try:
            cache_key = self._generate_cache_key(documents)
            cached_result = self._load_from_cache(cache_key)
            
            if cached_result:
                self.logger.info("Using cached analysis results")
                return cached_result
        except Exception as e:
            self.logger.warning(f"Cache key generation failed, proceeding without cache: {e}")
        
        self.logger.info("Starting AI analysis of documents")
        
        analysis_results = {
            'property_analysis': {},
            'financial_insights': {},
            'market_analysis': {},
            'risk_assessment': {},
            'investment_recommendations': {},
            'confidence_scores': {},
            'metadata': {
                'analysis_timestamp': datetime.now().isoformat(),
                'ai_models_used': self._get_models_used(),
                'processing_method': 'ai' if self.openai_available else 'rule_based'
            }
        }
        
        # Analyze each document type
        if documents.get('rent_roll'):
            analysis_results['property_analysis'] = self._analyze_rent_roll(documents['rent_roll'])
        
        if documents.get('t12'):
            analysis_results['financial_insights'] = self._analyze_financial_data(documents['t12'])
        
        if documents.get('offering_memo'):
            memo_analysis = self._analyze_offering_memo(documents['offering_memo'])
            analysis_results['market_analysis'] = memo_analysis.get('market_analysis', {})
            analysis_results['investment_recommendations'] = memo_analysis.get('investment_highlights', {})
        
        # Cross-document analysis
        analysis_results['risk_assessment'] = self._assess_investment_risk(documents)
        analysis_results['confidence_scores'] = self._calculate_confidence_scores(documents, analysis_results)
        
        # Generate comprehensive insights
        analysis_results['summary'] = self._generate_investment_summary(analysis_results)
        
        # Cache the results
        try:
            cache_key = self._generate_cache_key(documents)
            self._save_to_cache(cache_key, analysis_results)
        except Exception as e:
            self.logger.warning(f"Failed to cache results: {e}")
        
        self.logger.info("AI analysis completed")
        return analysis_results
    
    def _analyze_rent_roll(self, rent_roll_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze rent roll data for property insights"""
        
        units = rent_roll_data.get('units', [])
        summary = rent_roll_data.get('summary', {})
        
        if not units:
            return {'error': 'No unit data available for analysis'}
        
        analysis = {
            'unit_mix_analysis': self._analyze_unit_mix(units),
            'rent_analysis': self._analyze_rent_patterns(units),
            'occupancy_analysis': self._analyze_occupancy(units),
            'revenue_optimization': self._identify_revenue_opportunities(units),
            'market_positioning': self._assess_market_position(units)
        }
        
        # Add AI-powered insights if available
        if self.openai_available:
            analysis['ai_insights'] = self._get_ai_rent_insights(units, summary)
        
        return analysis
    
    def _analyze_unit_mix(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze unit mix and composition"""
        
        bedroom_counts = {}
        bathroom_counts = {}
        sqft_by_type = {}
        rent_by_type = {}
        
        for unit in units:
            bedrooms = unit.get('bedrooms', 0)
            bathrooms = unit.get('bathrooms', 0)
            sqft = unit.get('sqft', 0)
            rent = unit.get('current_rent', 0)
            
            # Count by bedroom type
            bed_key = f"{int(bedrooms)}BR" if bedrooms else "Studio"
            bedroom_counts[bed_key] = bedroom_counts.get(bed_key, 0) + 1
            
            # Track sqft and rent by type
            if bed_key not in sqft_by_type:
                sqft_by_type[bed_key] = []
                rent_by_type[bed_key] = []
            
            if sqft > 0:
                sqft_by_type[bed_key].append(sqft)
            if rent > 0:
                rent_by_type[bed_key].append(rent)
        
        # Calculate averages
        unit_mix = {}
        for unit_type in bedroom_counts:
            count = bedroom_counts[unit_type]
            avg_sqft = np.mean(sqft_by_type[unit_type]) if sqft_by_type[unit_type] else 0
            avg_rent = np.mean(rent_by_type[unit_type]) if rent_by_type[unit_type] else 0
            
            unit_mix[unit_type] = {
                'count': count,
                'percentage': (count / len(units)) * 100,
                'avg_sqft': round(avg_sqft, 0),
                'avg_rent': round(avg_rent, 0),
                'rent_per_sqft': round(avg_rent / avg_sqft, 2) if avg_sqft > 0 else 0
            }
        
        return {
            'unit_mix': unit_mix,
            'total_units': len(units),
            'unit_types': len(bedroom_counts),
            'dominant_type': max(bedroom_counts, key=bedroom_counts.get) if bedroom_counts else None
        }
    
    def _analyze_rent_patterns(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze rent patterns and pricing"""
        
        rents = [unit.get('current_rent', 0) for unit in units if unit.get('current_rent', 0) > 0]
        
        if not rents:
            return {'error': 'No rent data available'}
        
        rent_analysis = {
            'total_monthly_revenue': sum(rents),
            'average_rent': np.mean(rents),
            'median_rent': np.median(rents),
            'rent_range': {
                'min': min(rents),
                'max': max(rents)
            },
            'rent_distribution': {
                'std_deviation': np.std(rents),
                'coefficient_of_variation': np.std(rents) / np.mean(rents) if np.mean(rents) > 0 else 0
            }
        }
        
        # Identify outliers
        q75, q25 = np.percentile(rents, [75, 25])
        iqr = q75 - q25
        lower_bound = q25 - (1.5 * iqr)
        upper_bound = q75 + (1.5 * iqr)
        
        rent_analysis['outliers'] = {
            'low_rent_units': len([r for r in rents if r < lower_bound]),
            'high_rent_units': len([r for r in rents if r > upper_bound]),
            'potential_below_market': [i for i, unit in enumerate(units) 
                                     if unit.get('current_rent', 0) < lower_bound]
        }
        
        return rent_analysis
    
    def _analyze_occupancy(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze occupancy patterns"""
        
        total_units = len(units)
        occupied_units = len([u for u in units if u.get('status', '').lower() == 'occupied'])
        vacant_units = total_units - occupied_units
        
        occupancy_rate = (occupied_units / total_units) * 100 if total_units > 0 else 0
        
        return {
            'total_units': total_units,
            'occupied_units': occupied_units,
            'vacant_units': vacant_units,
            'occupancy_rate': round(occupancy_rate, 2),
            'vacancy_rate': round(100 - occupancy_rate, 2),
            'occupancy_status': self._categorize_occupancy(occupancy_rate)
        }
    
    def _identify_revenue_opportunities(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Identify revenue optimization opportunities"""
        
        opportunities = []
        
        # Calculate market rent potential
        rents_by_type = {}
        for unit in units:
            unit_type = f"{int(unit.get('bedrooms', 0))}BR"
            current_rent = unit.get('current_rent', 0)
            
            if unit_type not in rents_by_type:
                rents_by_type[unit_type] = []
            if current_rent > 0:
                rents_by_type[unit_type].append(current_rent)
        
        # Find below-market units
        below_market_units = []
        for unit_type, rents in rents_by_type.items():
            if len(rents) > 1:
                market_rent = np.percentile(rents, 75)  # 75th percentile as market
                for i, unit in enumerate(units):
                    if (f"{int(unit.get('bedrooms', 0))}BR" == unit_type and 
                        unit.get('current_rent', 0) < market_rent * 0.9):  # 10% below market
                        below_market_units.append({
                            'unit': unit.get('unit', ''),
                            'current_rent': unit.get('current_rent', 0),
                            'market_rent': market_rent,
                            'potential_increase': market_rent - unit.get('current_rent', 0)
                        })
        
        total_revenue_potential = sum(unit['potential_increase'] for unit in below_market_units)
        
        return {
            'below_market_units': below_market_units,
            'total_units_below_market': len(below_market_units),
            'monthly_revenue_potential': round(total_revenue_potential, 0),
            'annual_revenue_potential': round(total_revenue_potential * 12, 0),
            'average_increase_per_unit': round(total_revenue_potential / len(below_market_units), 0) if below_market_units else 0
        }
    
    def _analyze_financial_data(self, t12_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze T12 financial performance"""
        
        financial_data = t12_data.get('financial_data', {})
        
        if not financial_data:
            return {'error': 'No financial data available for analysis'}
        
        analysis = {
            'performance_metrics': self._calculate_performance_metrics(financial_data),
            'expense_analysis': self._analyze_expenses(financial_data),
            'income_analysis': self._analyze_income(financial_data),
            'trends': self._analyze_financial_trends(financial_data)
        }
        
        if self.openai_available:
            analysis['ai_insights'] = self._get_ai_financial_insights(financial_data)
        
        return analysis
    
    def _calculate_performance_metrics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key financial performance metrics"""
        
        gross_income = financial_data.get('gross_income', 0)
        operating_expenses = financial_data.get('operating_expenses', 0)
        noi = financial_data.get('noi', gross_income - operating_expenses)
        
        return {
            'gross_income': gross_income,
            'operating_expenses': operating_expenses,
            'noi': noi,
            'expense_ratio': (operating_expenses / gross_income * 100) if gross_income > 0 else 0,
            'noi_margin': (noi / gross_income * 100) if gross_income > 0 else 0
        }
    
    def _analyze_offering_memo(self, memo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze offering memorandum for investment insights"""
        
        text_content = memo_data.get('raw_text', '')
        property_info = memo_data.get('property_info', {})
        highlights = memo_data.get('investment_highlights', [])
        
        analysis = {
            'property_summary': property_info,
            'investment_highlights': highlights,
            'market_analysis': self._extract_market_info(text_content),
            'risk_factors': self._extract_risk_factors(text_content)
        }
        
        if self.openai_available and text_content:
            analysis['ai_summary'] = self._get_ai_memo_summary(text_content)
        
        return analysis
    
    def _assess_investment_risk(self, documents: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall investment risk"""
        
        risk_factors = []
        risk_score = 0  # 0-100, higher is riskier
        
        # Analyze occupancy risk
        if documents.get('rent_roll'):
            rent_roll = documents['rent_roll']
            units = rent_roll.get('units', [])
            if units:
                occupied = len([u for u in units if u.get('status', '').lower() == 'occupied'])
                occupancy_rate = (occupied / len(units)) * 100
                
                if occupancy_rate < 85:
                    risk_factors.append("Low occupancy rate")
                    risk_score += 20
                elif occupancy_rate < 95:
                    risk_score += 10
        
        # Analyze financial risk
        if documents.get('t12'):
            financial_data = documents['t12'].get('financial_data', {})
            expense_ratio = financial_data.get('expense_ratio', 0)
            
            if expense_ratio > 50:
                risk_factors.append("High expense ratio")
                risk_score += 15
            elif expense_ratio > 40:
                risk_score += 8
        
        return {
            'risk_score': min(risk_score, 100),
            'risk_level': self._categorize_risk(risk_score),
            'risk_factors': risk_factors,
            'mitigation_strategies': self._suggest_risk_mitigation(risk_factors)
        }
    
    def _calculate_confidence_scores(self, documents: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate confidence scores for analysis"""
        
        scores = {
            'overall_confidence': 0,
            'data_quality': 0,
            'analysis_depth': 0,
            'ai_confidence': 0
        }
        
        # Data quality score
        docs_processed = len([d for d in documents.values() if d])
        scores['data_quality'] = min((docs_processed / 3) * 100, 100)  # Max 3 main docs
        
        # Analysis depth score
        analysis_sections = len([section for section in analysis.values() if section and isinstance(section, dict)])
        scores['analysis_depth'] = min((analysis_sections / 5) * 100, 100)
        
        # AI confidence (if AI was used)
        scores['ai_confidence'] = 90 if self.openai_available else 60
        
        # Overall confidence
        scores['overall_confidence'] = np.mean([
            scores['data_quality'],
            scores['analysis_depth'],
            scores['ai_confidence']
        ])
        
        return scores
    
    def _generate_investment_summary(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive investment summary"""
        
        summary = {
            'investment_grade': 'B',
            'key_strengths': [],
            'key_concerns': [],
            'recommended_actions': [],
            'investment_thesis': ''
        }
        
        # Analyze strengths and concerns based on analysis results
        property_analysis = analysis.get('property_analysis', {})
        financial_insights = analysis.get('financial_insights', {})
        risk_assessment = analysis.get('risk_assessment', {})
        
        # Occupancy strength/concern
        occupancy_analysis = property_analysis.get('occupancy_analysis', {})
        occupancy_rate = occupancy_analysis.get('occupancy_rate', 0)
        
        if occupancy_rate > 95:
            summary['key_strengths'].append("High occupancy rate indicates strong demand")
        elif occupancy_rate < 85:
            summary['key_concerns'].append("Below-market occupancy rate")
        
        # Financial performance
        performance = financial_insights.get('performance_metrics', {})
        expense_ratio = performance.get('expense_ratio', 0)
        
        if expense_ratio < 35:
            summary['key_strengths'].append("Efficient operations with low expense ratio")
        elif expense_ratio > 50:
            summary['key_concerns'].append("High operating expenses")
        
        # Risk assessment
        risk_score = risk_assessment.get('risk_score', 50)
        if risk_score < 30:
            summary['investment_grade'] = 'A'
        elif risk_score < 50:
            summary['investment_grade'] = 'B'
        else:
            summary['investment_grade'] = 'C'
        
        return summary
    
    # Helper methods
    
    def _get_models_used(self) -> List[str]:
        """Get list of AI models used"""
        models = []
        if self.openai_available:
            models.append("OpenAI GPT")
        if self.spacy_available:
            models.append("spaCy NLP")
        if not models:
            models.append("Rule-based analysis")
        return models
    
    def _categorize_occupancy(self, occupancy_rate: float) -> str:
        """Categorize occupancy rate"""
        if occupancy_rate >= 95:
            return "Excellent"
        elif occupancy_rate >= 90:
            return "Good"
        elif occupancy_rate >= 85:
            return "Fair"
        else:
            return "Poor"
    
    def _categorize_risk(self, risk_score: int) -> str:
        """Categorize risk level"""
        if risk_score < 30:
            return "Low"
        elif risk_score < 50:
            return "Medium"
        elif risk_score < 70:
            return "High"
        else:
            return "Very High"
    
    def _suggest_risk_mitigation(self, risk_factors: List[str]) -> List[str]:
        """Suggest risk mitigation strategies"""
        strategies = []
        
        for factor in risk_factors:
            if "occupancy" in factor.lower():
                strategies.append("Implement aggressive leasing campaign")
                strategies.append("Review and adjust rental rates")
            elif "expense" in factor.lower():
                strategies.append("Conduct expense audit and optimization")
                strategies.append("Negotiate vendor contracts")
        
        return strategies
    
    def _extract_market_info(self, text: str) -> Dict[str, Any]:
        """Extract market information from text"""
        market_info = {}
        
        # Simple pattern matching for market info
        location_match = re.search(r'(market|area|location).*?([A-Z][a-z]+,?\s*[A-Z]{2})', text, re.IGNORECASE)
        if location_match:
            market_info['market'] = location_match.group(2)
        
        return market_info
    
    def _extract_risk_factors(self, text: str) -> List[str]:
        """Extract risk factors from text"""
        risk_factors = []
        
        # Look for risk section
        risk_section = re.search(r'risk.*?factors?(.*?)(?=\\n\\n|$)', text, re.IGNORECASE | re.DOTALL)
        if risk_section:
            # Extract bullet points or sentences
            risks = re.findall(r'[•▪▫-]\\s*([^\\n]+)', risk_section.group(1))
            risk_factors.extend([risk.strip() for risk in risks])
        
        return risk_factors[:5]  # Limit to top 5
    
    def _analyze_expenses(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze expense breakdown"""
        # Placeholder - would analyze detailed expense categories
        return {
            'total_expenses': financial_data.get('operating_expenses', 0),
            'expense_categories': {},
            'expense_trends': {}
        }
    
    def _analyze_income(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze income breakdown"""
        return {
            'total_income': financial_data.get('gross_income', 0),
            'income_sources': {},
            'income_trends': {}
        }
    
    def _analyze_financial_trends(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze financial trends"""
        return {
            'income_trend': 'stable',
            'expense_trend': 'stable',
            'noi_trend': 'stable'
        }
    
    def _assess_market_position(self, units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess market positioning"""
        return {
            'market_position': 'competitive',
            'pricing_strategy': 'market_rate'
        }
    
    # AI-powered methods (require OpenAI API)
    
    def _get_ai_rent_insights(self, units: List[Dict[str, Any]], summary: Dict[str, Any]) -> str:
        """Get AI insights on rent roll data"""
        if not self.openai_available:
            return "AI analysis not available"
        
        try:
            prompt = f"""
            Analyze this rent roll data and provide insights:
            
            Total Units: {len(units)}
            Average Rent: ${summary.get('average_rent', 0):.0f}
            Total Monthly Revenue: ${summary.get('total_monthly_rent', 0):.0f}
            
            Provide 3-4 key insights about this property's rental performance.
            """
            
            response = self.client.completions.create(
                model="gpt-3.5-turbo-instruct",
                prompt=prompt,
                max_tokens=200,
                temperature=0.1
            )
            
            return response.choices[0].text.strip()
        except Exception as e:
            self.logger.error(f"Error getting AI rent insights: {e}")
            return "AI analysis failed"
    
    def _get_ai_financial_insights(self, financial_data: Dict[str, Any]) -> str:
        """Get AI insights on financial data"""
        if not self.openai_available:
            return "AI analysis not available"
        
        try:
            prompt = f"""
            Analyze this financial data and provide insights:
            
            Gross Income: ${financial_data.get('gross_income', 0):,.0f}
            Operating Expenses: ${financial_data.get('operating_expenses', 0):,.0f}
            NOI: ${financial_data.get('noi', 0):,.0f}
            
            Provide 3-4 key insights about the financial performance.
            """
            
            response = self.client.completions.create(
                model="gpt-3.5-turbo-instruct",
                prompt=prompt,
                max_tokens=200,
                temperature=0.1
            )
            
            return response.choices[0].text.strip()
        except Exception as e:
            self.logger.error(f"Error getting AI financial insights: {e}")
            return "AI analysis failed"
    
    def _get_ai_memo_summary(self, text: str) -> str:
        """Get AI summary of offering memorandum"""
        if not self.openai_available:
            return "AI analysis not available"
        
        try:
            # Truncate text to fit token limits
            text_sample = text[:3000] if len(text) > 3000 else text
            
            prompt = f"""
            Summarize this offering memorandum excerpt and highlight key investment points:
            
            {text_sample}
            
            Provide a concise summary focusing on investment highlights and key property details.
            """
            
            response = self.client.completions.create(
                model="gpt-3.5-turbo-instruct",
                prompt=prompt,
                max_tokens=300,
                temperature=0.1
            )
            
            return response.choices[0].text.strip()
        except Exception as e:
            self.logger.error(f"Error getting AI memo summary: {e}")
            return "AI analysis failed"