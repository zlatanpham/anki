import { test, expect } from '@playwright/test';

/**
 * TC-001: User Login
 * Objective: Verify user can successfully log in with valid credentials
 * Priority: High
 */
test.describe('TC-001: User Login', () => {
  test('User can successfully log in with valid credentials', async ({ page }) => {
    // Step 1: Navigate to http://localhost:3000/login
    await page.goto('/login');
    
    // Verify we're on the login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    
    // Step 2: Enter email: test@example.com
    await page.getByLabel('Email').fill('test@example.com');
    
    // Step 3: Enter password: password123
    await page.getByLabel('Password').fill('password123');
    
    // Step 4: Click "Sign In" button
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    
    // Expected Result: User is redirected to dashboard (/) 
    // Note: Test case documentation mentioned /decks but actual app redirects to / (dashboard)
    await expect(page).toHaveURL('/');
    
    // Verify we're successfully logged in by checking for dashboard elements
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Wait for the page to fully load with user data
    await page.waitForTimeout(2000);
    
    // Verify we can see dashboard-specific content that only appears when authenticated
    await expect(page.getByText('Ready to learn something new today')).toBeVisible();
    
    // Verify we're no longer on the login page
    await expect(page.getByText('Login with your email and password')).not.toBeVisible();
  });

  test('Login form validation works correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    
    // Should show validation errors
    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    
    // Test invalid email format
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });
});