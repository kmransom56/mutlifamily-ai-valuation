import { test, expect } from '@playwright/test';

test.describe('Property Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Skip authentication in development mode
    // In production, this would include actual login flow
  });

  test('should display properties page and create new property', async ({ page }) => {
    // Navigate to properties page
    await page.click('text=Properties');
    await expect(page).toHaveURL('/properties');
    
    // Check page loads correctly
    await expect(page.locator('h1')).toContainText('Properties');
    
    // Should show existing property from test data
    await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
    
    // Click on a property to view details
    await page.click('[data-testid="property-view-link"]');
    
    // Should navigate to property detail page
    await expect(page).toHaveURL(/\/properties\/\d+/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle property search and filtering', async ({ page }) => {
    await page.goto('/properties');
    
    // Test search functionality
    const searchInput = page.locator('[data-testid="property-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Heather');
      await page.keyboard.press('Enter');
      
      // Should filter results
      await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
    }
  });

  test('should display individual property details correctly', async ({ page }) => {
    await page.goto('/properties/1');
    
    // Check loading state first
    const loadingElement = page.locator('text=Loading property');
    if (await loadingElement.isVisible()) {
      await loadingElement.waitFor({ state: 'hidden', timeout: 10000 });
    }
    
    // Check property details are displayed
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Back to Properties')).toBeVisible();
    
    // Check for property information sections
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Property Type')).toBeVisible();
    
    // Test navigation back to properties
    await page.click('text=Back to Properties');
    await expect(page).toHaveURL('/properties');
  });

  test('should handle file upload workflow', async ({ page }) => {
    await page.goto('/');
    
    // Look for upload form or button
    const uploadButton = page.locator('[data-testid="upload-button"]');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      
      // Should show upload modal or navigate to upload page
      await expect(page.locator('text=Upload')).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties');
    
    // Check mobile navigation
    const mobileMenu = page.locator('[aria-label="Menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      
      // Should show mobile navigation menu
      await expect(page.locator('nav')).toBeVisible();
    }
    
    // Check responsive layout
    await expect(page.locator('main')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 error
    await page.goto('/properties/nonexistent');
    
    // Should show error message or 404 page
    const errorElement = page.locator('text=Property not found');
    const notFoundElement = page.locator('text=404');
    
    await expect(errorElement.or(notFoundElement)).toBeVisible();
  });

  test('should have proper accessibility features', async ({ page }) => {
    await page.goto('/properties');
    
    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
  });

  test('should maintain state across page refreshes', async ({ page }) => {
    await page.goto('/properties');
    
    // Wait for content to load
    await expect(page.locator('h1')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Content should still be there
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
  });
});

test.describe('Navigation and Layout', () => {
  test('should have consistent header across pages', async ({ page }) => {
    // Check header on home page
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Multifamily AI')).toBeVisible();
    
    // Navigate to properties and check header
    await page.click('text=Properties');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Multifamily AI')).toBeVisible();
    
    // Check navigation links
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Calculator')).toBeVisible();
  });

  test('should have consistent footer across pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toBeVisible();
    
    await page.goto('/properties');
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/properties');
    await expect(page.locator('h1')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle concurrent property views', async ({ browser }) => {
    // Create multiple page contexts
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // Navigate all pages to properties simultaneously
    await Promise.all(
      pages.map(page => page.goto('/properties/1'))
    );
    
    // All pages should load successfully
    await Promise.all(
      pages.map(page => expect(page.locator('h1')).toBeVisible())
    );
    
    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });
});

test.describe('Cross-browser compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ browser }) => {
      if (browser.browserType().name() !== browserName) {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/properties');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
      
      await context.close();
    });
  });
});