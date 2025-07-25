'use client';

import React from 'react';

// Go High Level CRM integration utility
export default class GoHighLevelCRM {
  private apiKey: string;
  private locationId: string;
  private baseUrl: string = 'https://rest.gohighlevel.com/v1';

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  // Authentication headers
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Create or update contact in GHL
  async createOrUpdateContact(contactData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...contactData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating/updating contact:', error);
      throw error;
    }
  }

  // Create opportunity in GHL
  async createOpportunity(opportunityData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/opportunities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...opportunityData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  }

  // Add contact to pipeline
  async addContactToPipeline(contactId: string, pipelineId: string, stageId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}/pipeline`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          pipelineId,
          stageId,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error adding contact to pipeline:', error);
      throw error;
    }
  }

  // Create task in GHL
  async createTask(taskData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...taskData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Send email via GHL
  async sendEmail(emailData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...emailData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Send SMS via GHL
  async sendSMS(smsData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/sms`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...smsData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  // Get contacts from GHL
  async getContacts(query: any = {}) {
    try {
      const queryParams = new URLSearchParams({
        locationId: this.locationId,
        ...query
      }).toString();

      const response = await fetch(`${this.baseUrl}/contacts?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  // Get opportunities from GHL
  async getOpportunities(query: any = {}) {
    try {
      const queryParams = new URLSearchParams({
        locationId: this.locationId,
        ...query
      }).toString();

      const response = await fetch(`${this.baseUrl}/opportunities?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }
  }

  // Create property in GHL as a custom object
  async createProperty(propertyData: any) {
    try {
      // Assuming you have a custom object for properties in GHL
      const response = await fetch(`${this.baseUrl}/custom-objects/properties`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...propertyData,
          locationId: this.locationId
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  // Create investor in GHL as a contact with investor tag
  async createInvestor(investorData: any) {
    try {
      const contactData = {
        ...investorData,
        tags: [...(investorData.tags || []), 'investor']
      };

      return await this.createOrUpdateContact(contactData);
    } catch (error) {
      console.error('Error creating investor:', error);
      throw error;
    }
  }

  // Create investment opportunity in GHL
  async createInvestmentOpportunity(propertyId: string, opportunityData: any) {
    try {
      const data = {
        ...opportunityData,
        customFields: {
          ...(opportunityData.customFields || {}),
          propertyId
        }
      };

      return await this.createOpportunity(data);
    } catch (error) {
      console.error('Error creating investment opportunity:', error);
      throw error;
    }
  }

  // Send property analysis to investors
  async sendPropertyAnalysisToInvestors(propertyData: any, investorGroupTag: string, emailTemplate: string) {
    try {
      // Get investors with the specified tag
      const investors = await this.getContacts({ tags: investorGroupTag });

      // Send email to each investor
      const emailPromises = investors.contacts.map((investor: any) => {
        return this.sendEmail({
          contactId: investor.id,
          templateId: emailTemplate,
          subject: `New Investment Opportunity: ${propertyData.name}`,
          customFields: {
            property_name: propertyData.name,
            property_location: propertyData.location,
            property_units: propertyData.units,
            property_cap_rate: propertyData.capRate,
            property_irr: propertyData.irr,
            property_equity_multiple: propertyData.equityMultiple
          }
        });
      });

      return await Promise.all(emailPromises);
    } catch (error) {
      console.error('Error sending property analysis to investors:', error);
      throw error;
    }
  }
}
