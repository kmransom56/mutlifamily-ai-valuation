import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InvestorNotification, InvestorRecipient, NotificationAttachment } from '@/types/processing';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create and send investor notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      jobId, 
      propertyId, 
      type, 
      recipients, 
      subject, 
      content, 
      attachments = [],
      scheduledAt 
    } = body;

    if (!type || !recipients || !subject || !content) {
      return NextResponse.json({
        error: 'Type, recipients, subject, and content are required'
      }, { status: 400 });
    }

    // Create notification
    const notification = await createInvestorNotification({
      jobId,
      propertyId,
      type,
      recipients,
      subject,
      content,
      attachments,
      scheduledAt,
      userId: session.user.id
    });

    // Send notification immediately or schedule it
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      await scheduleNotification(notification);
    } else {
      await sendNotification(notification);
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      status: notification.status
    });

  } catch (error) {
    console.error('Investor notification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create investor notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get notifications for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const notifications = await getNotifications({
      userId: session.user.id,
      jobId,
      propertyId,
      status,
      limit
    });

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('Error getting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

async function createInvestorNotification(params: {
  jobId?: string;
  propertyId?: string;
  type: string;
  recipients: InvestorRecipient[];
  subject: string;
  content: string;
  attachments: NotificationAttachment[];
  scheduledAt?: string;
  userId: string;
}): Promise<InvestorNotification> {
  const notificationId = uuidv4();
  
  const notification: InvestorNotification = {
    id: notificationId,
    jobId: params.jobId,
    propertyId: params.propertyId,
    type: params.type as any,
    recipients: params.recipients,
    subject: params.subject,
    content: params.content,
    attachments: params.attachments,
    scheduledAt: params.scheduledAt,
    status: params.scheduledAt ? 'scheduled' : 'draft'
  };

  // Save notification
  await saveNotification(notification, params.userId);
  
  return notification;
}

async function sendNotification(notification: InvestorNotification): Promise<void> {
  try {
    // Filter recipients based on their preferences
    const eligibleRecipients = await filterRecipientsByPreferences(
      notification.recipients,
      notification
    );

    // Generate email content
    const emailContent = await generateEmailContent(notification);
    
    // Send to each eligible recipient
    const sendPromises = eligibleRecipients.map(recipient => 
      sendEmailToRecipient(recipient, emailContent, notification.attachments)
    );

    await Promise.allSettled(sendPromises);
    
    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    
    // Save updated notification (in production, you'd update the database)
    console.log('Notification sent:', notification.id);
    
  } catch (error) {
    console.error('Failed to send notification:', error);
    notification.status = 'failed';
    throw error;
  }
}

async function scheduleNotification(notification: InvestorNotification): Promise<void> {
  // In a production environment, you would use a job queue like Bull or agenda
  // For now, simulate scheduling
  console.log(`Notification ${notification.id} scheduled for ${notification.scheduledAt}`);
  
  notification.status = 'scheduled';
  
  // Simulate scheduling with setTimeout (not suitable for production)
  if (notification.scheduledAt) {
    const delay = new Date(notification.scheduledAt).getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Only schedule if within 24 hours
      setTimeout(() => {
        sendNotification(notification).catch(console.error);
      }, delay);
    }
  }
}

async function filterRecipientsByPreferences(
  recipients: InvestorRecipient[],
  notification: InvestorNotification
): Promise<InvestorRecipient[]> {
  return recipients.filter(recipient => {
    // Check if recipient wants this type of notification
    if (notification.type === 'new_deal') {
      // Filter based on deal preferences
      return true; // Simplified - in production, check actual preferences
    }
    
    if (notification.type === 'market_update') {
      return recipient.preferences.frequency !== 'immediate' || 
             new Date().getDay() === 1; // Monday market updates
    }
    
    return true;
  });
}

async function generateEmailContent(notification: InvestorNotification): Promise<{
  subject: string;
  html: string;
  text: string;
}> {
  const baseContent = {
    subject: notification.subject,
    text: notification.content
  };

  let html = '';
  
  switch (notification.type) {
    case 'new_deal':
      html = await generateNewDealEmailHTML(notification);
      break;
    case 'analysis_complete':
      html = await generateAnalysisCompleteEmailHTML(notification);
      break;
    case 'price_change':
      html = await generatePriceChangeEmailHTML(notification);
      break;
    case 'market_update':
      html = await generateMarketUpdateEmailHTML(notification);
      break;
    default:
      html = await generateGenericEmailHTML(notification);
  }

  return {
    ...baseContent,
    html
  };
}

async function generateNewDealEmailHTML(notification: InvestorNotification): Promise<string> {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .property-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
          .metric { text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .metric-label { font-size: 12px; color: #666; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>New Investment Opportunity</h1>
          <p>Exclusive deal alert for qualified investors</p>
        </div>
        
        <div class="content">
          <div class="property-card">
            <h2>Premium Multifamily Property</h2>
            <p>${notification.content}</p>
            
            <div class="metrics">
              <div class="metric">
                <div class="metric-value">6.5%</div>
                <div class="metric-label">Cap Rate</div>
              </div>
              <div class="metric">
                <div class="metric-value">$2.5M</div>
                <div class="metric-label">Asking Price</div>
              </div>
              <div class="metric">
                <div class="metric-value">48</div>
                <div class="metric-label">Units</div>
              </div>
              <div class="metric">
                <div class="metric-value">12.3%</div>
                <div class="metric-label">Projected IRR</div>
              </div>
            </div>
            
            <a href="#" class="cta-button">View Full Analysis</a>
          </div>
          
          <h3>Why This Deal Stands Out:</h3>
          <ul>
            <li>Prime location with strong rental demand</li>
            <li>Recent capital improvements completed</li>
            <li>Below-market rents with upside potential</li>
            <li>Professional property management in place</li>
          </ul>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Review the attached investment summary</li>
            <li>Schedule a property tour</li>
            <li>Submit your Letter of Intent</li>
          </ol>
        </div>
        
        <div class="footer">
          <p>This opportunity is being shared with a select group of qualified investors.</p>
          <p>For questions, reply to this email or call (555) 123-4567</p>
          <p><a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a></p>
        </div>
      </body>
    </html>
  `;
}

async function generateAnalysisCompleteEmailHTML(notification: InvestorNotification): Promise<string> {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-card { border-left: 4px solid #28a745; padding: 15px; background: #f8f9fa; margin: 20px 0; }
          .download-section { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .download-link { color: #007bff; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Analysis Complete</h1>
          <p>Your property analysis is ready for review</p>
        </div>
        
        <div class="content">
          <div class="status-card">
            <h3>Analysis Status: Complete</h3>
            <p>We've successfully analyzed your property data and generated comprehensive investment insights.</p>
          </div>
          
          <p>${notification.content}</p>
          
          <div class="download-section">
            <h3>Available Reports:</h3>
            <ul>
              <li><a href="#" class="download-link">📊 Executive Summary (PDF)</a></li>
              <li><a href="#" class="download-link">📈 Detailed Financial Analysis (Excel)</a></li>
              <li><a href="#" class="download-link">🎯 Investment Pitch Deck (PowerPoint)</a></li>
              <li><a href="#" class="download-link">📋 Raw Data Export (JSON)</a></li>
            </ul>
          </div>
          
          <p><strong>Key Findings:</strong></p>
          <ul>
            <li>Strong cash flow potential identified</li>
            <li>Market analysis shows favorable conditions</li>
            <li>Value-add opportunities highlighted</li>
            <li>Risk factors and mitigation strategies outlined</li>
          </ul>
        </div>
      </body>
    </html>
  `;
}

async function generatePriceChangeEmailHTML(notification: InvestorNotification): Promise<string> {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; }
          .price-change { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .old-price { text-decoration: line-through; color: #6c757d; }
          .new-price { color: #28a745; font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 Price Update Alert</h1>
          <p>Important pricing information for your tracked property</p>
        </div>
        
        <div class="content">
          <div class="price-change">
            <h3>Price Change Notification</h3>
            <p>Previous Price: <span class="old-price">$2,750,000</span></p>
            <p>New Price: <span class="new-price">$2,650,000</span></p>
            <p><strong>Savings: $100,000 (3.6% reduction)</strong></p>
          </div>
          
          <p>${notification.content}</p>
        </div>
      </body>
    </html>
  `;
}

async function generateMarketUpdateEmailHTML(notification: InvestorNotification): Promise<string> {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .market-data { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .market-metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Weekly Market Update</h1>
          <p>Latest multifamily market insights and trends</p>
        </div>
        
        <div class="content">
          <div class="market-data">
            <div class="market-metric">
              <h4>Average Cap Rate</h4>
              <p><strong>5.8%</strong> <span style="color: #28a745;">↑ 0.1%</span></p>
            </div>
            <div class="market-metric">
              <h4>Avg Price/Unit</h4>
              <p><strong>$185K</strong> <span style="color: #dc3545;">↓ 2.1%</span></p>
            </div>
            <div class="market-metric">
              <h4>Occupancy Rate</h4>
              <p><strong>94.2%</strong> <span style="color: #28a745;">↑ 0.5%</span></p>
            </div>
          </div>
          
          <p>${notification.content}</p>
        </div>
      </body>
    </html>
  `;
}

async function generateGenericEmailHTML(notification: InvestorNotification): Promise<string> {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Investment Update</h1>
        </div>
        <div class="content">
          <p>${notification.content}</p>
        </div>
      </body>
    </html>
  `;
}

async function sendEmailToRecipient(
  recipient: InvestorRecipient,
  emailContent: { subject: string; html: string; text: string },
  attachments: NotificationAttachment[]
): Promise<void> {
  // In a production environment, you would use an email service like SendGrid, AWS SES, etc.
  // For now, simulate email sending
  console.log(`Sending email to ${recipient.email}:`);
  console.log(`Subject: ${emailContent.subject}`);
  console.log(`Attachments: ${attachments.length}`);
  
  // Simulate email delivery delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`Email sent successfully to ${recipient.name} (${recipient.email})`);
}

async function saveNotification(notification: InvestorNotification, userId: string): Promise<void> {
  const notificationsDir = path.join(process.cwd(), 'storage', 'notifications', userId);
  if (!fs.existsSync(notificationsDir)) {
    fs.mkdirSync(notificationsDir, { recursive: true });
  }
  
  const notificationPath = path.join(notificationsDir, `${notification.id}.json`);
  fs.writeFileSync(notificationPath, JSON.stringify(notification, null, 2));
}

async function getNotifications(params: {
  userId: string;
  jobId?: string | null;
  propertyId?: string | null;
  status?: string | null;
  limit: number;
}): Promise<InvestorNotification[]> {
  const notificationsDir = path.join(process.cwd(), 'storage', 'notifications', params.userId);
  
  if (!fs.existsSync(notificationsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(notificationsDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(notificationsDir, a));
      const statB = fs.statSync(path.join(notificationsDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime(); // Most recent first
    })
    .slice(0, params.limit);
  
  const notifications: InvestorNotification[] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(notificationsDir, file), 'utf-8');
      const notification: InvestorNotification = JSON.parse(content);
      
      // Apply filters
      if (params.jobId && notification.jobId !== params.jobId) continue;
      if (params.propertyId && notification.propertyId !== params.propertyId) continue;
      if (params.status && notification.status !== params.status) continue;
      
      notifications.push(notification);
    } catch (error) {
      console.error(`Error loading notification ${file}:`, error);
    }
  }
  
  return notifications;
}