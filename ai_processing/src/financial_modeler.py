"""
Financial Modeling System for Multifamily Property Analysis
Creates comprehensive financial models and investment projections
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
import logging
from datetime import datetime, timedelta
import json

class FinancialModeler:
    """Creates financial models and investment projections"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Default assumptions (can be overridden by config)
        self.default_assumptions = {
            'hold_period': 5,
            'exit_cap_rate': 0.065,
            'annual_rent_growth': 0.03,
            'annual_expense_growth': 0.025,
            'vacancy_rate': 0.05,
            'management_fee': 0.05,
            'capital_reserve': 0.02,
            'discount_rate': 0.10
        }
        
        # Update with config values
        self.assumptions = {**self.default_assumptions, **config.get('financial_assumptions', {})}
    
    def create_models(self, documents: Dict[str, Any], ai_insights: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create comprehensive financial models
        
        Args:
            documents: Parsed document data
            ai_insights: AI analysis results
            
        Returns:
            Dictionary containing financial models and projections
        """
        
        self.logger.info("Creating financial models")
        
        # Extract base financial data
        base_data = self._extract_base_financials(documents)
        
        # Create investment projections
        projections = self._create_investment_projections(base_data, ai_insights)
        
        # Calculate returns analysis
        returns = self._calculate_returns_analysis(base_data, projections)
        
        # Create sensitivity analysis
        sensitivity = self._create_sensitivity_analysis(base_data, projections)
        
        # Generate cash flow analysis
        cash_flows = self._generate_cash_flow_analysis(projections)
        
        # Create comparative analysis
        comparatives = self._create_comparative_analysis(base_data, ai_insights)
        
        financial_models = {
            'base_financials': base_data,
            'investment_projections': projections,
            'returns_analysis': returns,
            'sensitivity_analysis': sensitivity,
            'cash_flow_analysis': cash_flows,
            'comparative_analysis': comparatives,
            'assumptions_used': self.assumptions,
            'model_metadata': {
                'created_at': datetime.now().isoformat(),
                'model_version': '1.0',
                'hold_period': self.assumptions['hold_period']
            }
        }
        
        self.logger.info("Financial models created successfully")
        return financial_models
    
    def _extract_base_financials(self, documents: Dict[str, Any]) -> Dict[str, Any]:
        """Extract base financial data from documents"""
        
        base_data = {
            'property_info': {},
            'current_financials': {},
            'unit_details': [],
            'market_data': {}
        }
        
        # Extract from rent roll
        if documents.get('rent_roll'):
            rent_roll = documents['rent_roll']
            units = rent_roll.get('units', [])
            summary = rent_roll.get('summary', {})
            
            base_data['unit_details'] = units
            base_data['current_financials']['total_units'] = len(units)
            base_data['current_financials']['gross_rental_revenue'] = summary.get('total_monthly_rent', 0) * 12
            base_data['current_financials']['average_rent'] = summary.get('average_rent', 0)
            base_data['current_financials']['total_sqft'] = summary.get('total_sqft', 0)
        
        # Extract from T12
        if documents.get('t12'):
            t12_data = documents['t12'].get('financial_data', {})
            base_data['current_financials'].update({
                'gross_income': t12_data.get('gross_income', base_data['current_financials'].get('gross_rental_revenue', 0)),
                'operating_expenses': t12_data.get('operating_expenses', 0),
                'noi': t12_data.get('noi', 0)
            })
        
        # Extract from offering memo
        if documents.get('offering_memo'):
            memo_data = documents['offering_memo']
            property_info = memo_data.get('property_info', {})
            base_data['property_info'] = property_info
        
        # Calculate derived metrics
        base_data['current_financials'] = self._calculate_derived_metrics(base_data['current_financials'])
        
        return base_data
    
    def _calculate_derived_metrics(self, financials: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate derived financial metrics"""
        
        gross_income = financials.get('gross_income', 0)
        operating_expenses = financials.get('operating_expenses', 0)
        total_units = financials.get('total_units', 1)
        
        # Calculate NOI if not provided
        if not financials.get('noi') and gross_income > 0:
            financials['noi'] = gross_income - operating_expenses
        
        # Calculate per-unit metrics
        if total_units > 0:
            financials['gross_income_per_unit'] = gross_income / total_units
            financials['expenses_per_unit'] = operating_expenses / total_units
            financials['noi_per_unit'] = financials.get('noi', 0) / total_units
        
        # Calculate ratios
        if gross_income > 0:
            financials['expense_ratio'] = (operating_expenses / gross_income) * 100
            financials['noi_margin'] = (financials.get('noi', 0) / gross_income) * 100
        
        return financials
    
    def _create_investment_projections(self, base_data: Dict[str, Any], ai_insights: Dict[str, Any]) -> Dict[str, Any]:
        """Create multi-year investment projections"""
        
        current_financials = base_data['current_financials']
        hold_period = self.assumptions['hold_period']
        
        # Base year values
        base_gross_income = current_financials.get('gross_income', 0)
        base_operating_expenses = current_financials.get('operating_expenses', 0)
        base_noi = current_financials.get('noi', base_gross_income - base_operating_expenses)
        
        # Create yearly projections
        projections = []
        
        for year in range(1, hold_period + 1):
            # Project income with growth
            projected_gross_income = base_gross_income * (1 + self.assumptions['annual_rent_growth']) ** year
            
            # Account for vacancy
            effective_gross_income = projected_gross_income * (1 - self.assumptions['vacancy_rate'])
            
            # Project expenses with growth
            projected_operating_expenses = base_operating_expenses * (1 + self.assumptions['annual_expense_growth']) ** year
            
            # Add management fee and reserves
            management_fee = effective_gross_income * self.assumptions['management_fee']
            capital_reserves = effective_gross_income * self.assumptions['capital_reserve']
            
            total_expenses = projected_operating_expenses + management_fee + capital_reserves
            
            # Calculate NOI
            projected_noi = effective_gross_income - total_expenses
            
            year_projection = {
                'year': year,
                'gross_income': round(projected_gross_income, 0),
                'vacancy_loss': round(projected_gross_income - effective_gross_income, 0),
                'effective_gross_income': round(effective_gross_income, 0),
                'operating_expenses': round(projected_operating_expenses, 0),
                'management_fee': round(management_fee, 0),
                'capital_reserves': round(capital_reserves, 0),
                'total_expenses': round(total_expenses, 0),
                'noi': round(projected_noi, 0),
                'noi_growth': round(((projected_noi / base_noi) - 1) * 100, 2) if base_noi > 0 else 0
            }
            
            projections.append(year_projection)
        
        return {
            'yearly_projections': projections,
            'projection_summary': self._summarize_projections(projections),
            'key_assumptions': {
                'rent_growth': self.assumptions['annual_rent_growth'],
                'expense_growth': self.assumptions['annual_expense_growth'],
                'vacancy_rate': self.assumptions['vacancy_rate'],
                'hold_period': hold_period
            }
        }
    
    def _calculate_returns_analysis(self, base_data: Dict[str, Any], projections: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive returns analysis"""
        
        yearly_projections = projections['yearly_projections']
        current_noi = base_data['current_financials'].get('noi', 0)
        
        # Estimate property value based on NOI and cap rates
        current_cap_rate = 0.06  # Default assumption
        estimated_current_value = current_noi / current_cap_rate if current_cap_rate > 0 else 0
        
        # Calculate exit value
        exit_noi = yearly_projections[-1]['noi'] if yearly_projections else current_noi
        exit_cap_rate = self.assumptions['exit_cap_rate']
        exit_value = exit_noi / exit_cap_rate if exit_cap_rate > 0 else 0
        
        # Calculate cash flows for IRR calculation
        cash_flows = []
        for projection in yearly_projections:
            # Simplified cash flow calculation
            debt_service = 0  # Would need loan terms
            cash_flow = projection['noi'] - debt_service
            cash_flows.append(cash_flow)
        
        # Add exit cash flow
        if cash_flows:
            cash_flows[-1] += exit_value
        
        # Calculate returns (simplified without actual debt service)
        cap_rate = current_noi / estimated_current_value if estimated_current_value > 0 else 0
        
        returns = {
            'estimated_value': round(estimated_current_value, 0),
            'exit_value': round(exit_value, 0),
            'value_appreciation': round(exit_value - estimated_current_value, 0),
            'cap_rate': round(cap_rate * 100, 2),
            'exit_cap_rate': round(exit_cap_rate * 100, 2),
            'noi_growth_total': round(((exit_noi / current_noi) - 1) * 100, 2) if current_noi > 0 else 0,
            'annual_cash_flows': [round(cf, 0) for cf in cash_flows[:-1]],  # Exclude exit year
            'key_metrics': {
                'price_per_unit': round(estimated_current_value / base_data['current_financials'].get('total_units', 1), 0),
                'price_per_sqft': round(estimated_current_value / base_data['current_financials'].get('total_sqft', 1), 0) if base_data['current_financials'].get('total_sqft', 0) > 0 else 0,
                'gross_rent_multiplier': round(estimated_current_value / base_data['current_financials'].get('gross_income', 1), 1) if base_data['current_financials'].get('gross_income', 0) > 0 else 0
            }
        }
        
        return returns
    
    def _create_sensitivity_analysis(self, base_data: Dict[str, Any], projections: Dict[str, Any]) -> Dict[str, Any]:
        """Create sensitivity analysis for key variables"""
        
        base_noi = base_data['current_financials'].get('noi', 0)
        base_cap_rate = 0.06
        
        # Define sensitivity ranges
        rent_growth_scenarios = [-0.01, 0.0, 0.02, 0.03, 0.05]  # -1% to +5%
        cap_rate_scenarios = [0.045, 0.055, 0.06, 0.065, 0.075]  # 4.5% to 7.5%
        expense_growth_scenarios = [0.01, 0.02, 0.025, 0.03, 0.04]  # 1% to 4%
        
        sensitivity_results = {
            'rent_growth_sensitivity': [],
            'cap_rate_sensitivity': [],
            'expense_growth_sensitivity': []
        }
        
        # Rent growth sensitivity
        for rent_growth in rent_growth_scenarios:
            temp_assumptions = {**self.assumptions, 'annual_rent_growth': rent_growth}
            scenario_projections = self._calculate_scenario_projections(base_data, temp_assumptions)
            final_noi = scenario_projections[-1]['noi'] if scenario_projections else base_noi
            scenario_value = final_noi / self.assumptions['exit_cap_rate']
            
            sensitivity_results['rent_growth_sensitivity'].append({
                'rent_growth': round(rent_growth * 100, 1),
                'final_noi': round(final_noi, 0),
                'exit_value': round(scenario_value, 0)
            })
        
        # Cap rate sensitivity
        for cap_rate in cap_rate_scenarios:
            scenario_value = base_noi / cap_rate
            sensitivity_results['cap_rate_sensitivity'].append({
                'cap_rate': round(cap_rate * 100, 1),
                'property_value': round(scenario_value, 0)
            })
        
        return sensitivity_results
    
    def _calculate_scenario_projections(self, base_data: Dict[str, Any], scenario_assumptions: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Calculate projections for a specific scenario"""
        
        current_financials = base_data['current_financials']
        hold_period = scenario_assumptions['hold_period']
        
        base_gross_income = current_financials.get('gross_income', 0)
        base_operating_expenses = current_financials.get('operating_expenses', 0)
        
        projections = []
        
        for year in range(1, hold_period + 1):
            projected_gross_income = base_gross_income * (1 + scenario_assumptions['annual_rent_growth']) ** year
            effective_gross_income = projected_gross_income * (1 - scenario_assumptions['vacancy_rate'])
            projected_operating_expenses = base_operating_expenses * (1 + scenario_assumptions['annual_expense_growth']) ** year
            
            management_fee = effective_gross_income * scenario_assumptions['management_fee']
            capital_reserves = effective_gross_income * scenario_assumptions['capital_reserve']
            total_expenses = projected_operating_expenses + management_fee + capital_reserves
            
            projected_noi = effective_gross_income - total_expenses
            
            projections.append({
                'year': year,
                'gross_income': projected_gross_income,
                'effective_gross_income': effective_gross_income,
                'total_expenses': total_expenses,
                'noi': projected_noi
            })
        
        return projections
    
    def _generate_cash_flow_analysis(self, projections: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed cash flow analysis"""
        
        yearly_projections = projections['yearly_projections']
        
        cash_flow_analysis = {
            'operating_cash_flows': [],
            'cumulative_cash_flow': 0,
            'average_annual_cash_flow': 0,
            'cash_flow_growth': []
        }
        
        cumulative = 0
        previous_cf = 0
        
        for projection in yearly_projections:
            # Simplified cash flow (NOI minus debt service)
            # In a real implementation, you'd include debt service calculations
            operating_cash_flow = projection['noi']  # Simplified
            cumulative += operating_cash_flow
            
            cash_flow_growth = 0
            if previous_cf > 0:
                cash_flow_growth = ((operating_cash_flow / previous_cf) - 1) * 100
            
            cash_flow_analysis['operating_cash_flows'].append({
                'year': projection['year'],
                'operating_cash_flow': round(operating_cash_flow, 0),
                'cumulative_cash_flow': round(cumulative, 0),
                'cash_flow_growth': round(cash_flow_growth, 2)
            })
            
            previous_cf = operating_cash_flow
        
        # Calculate averages
        if yearly_projections:
            cash_flow_analysis['average_annual_cash_flow'] = round(cumulative / len(yearly_projections), 0)
            cash_flow_analysis['cumulative_cash_flow'] = round(cumulative, 0)
        
        return cash_flow_analysis
    
    def _create_comparative_analysis(self, base_data: Dict[str, Any], ai_insights: Dict[str, Any]) -> Dict[str, Any]:
        """Create comparative analysis with market benchmarks"""
        
        current_financials = base_data['current_financials']
        
        # Market benchmarks (these would typically come from external data sources)
        market_benchmarks = {
            'cap_rate_range': {'low': 0.045, 'high': 0.075, 'median': 0.06},
            'expense_ratio_range': {'low': 30, 'high': 50, 'median': 40},
            'rent_per_sqft_range': {'low': 1.0, 'high': 2.5, 'median': 1.75}
        }
        
        # Calculate property metrics
        property_metrics = {
            'cap_rate': (current_financials.get('noi', 0) / (current_financials.get('noi', 0) / 0.06)) * 100 if current_financials.get('noi', 0) > 0 else 0,
            'expense_ratio': current_financials.get('expense_ratio', 0),
            'rent_per_sqft': (current_financials.get('average_rent', 0) * 12) / (current_financials.get('total_sqft', 1) / current_financials.get('total_units', 1)) if current_financials.get('total_sqft', 0) > 0 else 0
        }
        
        # Compare to benchmarks
        comparative_analysis = {
            'property_metrics': property_metrics,
            'market_benchmarks': market_benchmarks,
            'market_position': {},
            'competitive_advantages': [],
            'areas_for_improvement': []
        }
        
        # Analyze market position
        for metric, value in property_metrics.items():
            if metric in market_benchmarks:
                benchmark = market_benchmarks[metric]
                if value <= benchmark['low']:
                    position = 'Below Market'
                elif value >= benchmark['high']:
                    position = 'Above Market'
                else:
                    position = 'Market Rate'
                
                comparative_analysis['market_position'][metric] = {
                    'property_value': round(value, 2),
                    'market_median': round(benchmark['median'] * (100 if 'ratio' in metric else 1), 2),
                    'position': position
                }
        
        return comparative_analysis
    
    def _summarize_projections(self, projections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize projection results"""
        
        if not projections:
            return {}
        
        first_year = projections[0]
        last_year = projections[-1]
        
        return {
            'total_years': len(projections),
            'year_1_noi': first_year['noi'],
            'final_year_noi': last_year['noi'],
            'total_noi_growth': round(((last_year['noi'] / first_year['noi']) - 1) * 100, 2) if first_year['noi'] > 0 else 0,
            'average_annual_noi': round(sum(p['noi'] for p in projections) / len(projections), 0),
            'total_projected_noi': round(sum(p['noi'] for p in projections), 0)
        }