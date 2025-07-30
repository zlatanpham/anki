import { test, expect } from '@playwright/test';

/**
 * TC-002: Deck Creation and Management
 * Objective: Verify users can create, edit, and manage decks
 * Priority: High
 */
test.describe('TC-002: Deck Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    await expect(page).toHaveURL('/');
  });

  test('User can create a new deck', async ({ page }) => {
    // Step 1: Navigate to decks page
    await page.getByRole('link', { name: 'Decks' }).click();
    await expect(page).toHaveURL('/decks');
    
    // Step 2: Click "Create Deck" button
    await page.getByRole('button', { name: 'Create Deck' }).click();
    
    // Step 3: Fill in deck details
    await page.getByLabel('Name').fill('Test Deck - E2E');
    await page.getByLabel('Description').fill('A test deck created during E2E testing');
    
    // Step 4: Submit the form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Expected Result: Deck is created and user is redirected
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+$/);
    
    // Verify deck details are displayed
    await expect(page.getByRole('heading', { name: 'Test Deck - E2E' })).toBeVisible();
    await expect(page.getByText('A test deck created during E2E testing')).toBeVisible();
    
    // Verify deck statistics are initialized
    await expect(page.getByText('0 cards')).toBeVisible();
    await expect(page.getByText('0 due')).toBeVisible();
  });

  test('User can edit an existing deck', async ({ page }) => {
    // First create a deck
    await page.getByRole('link', { name: 'Decks' }).click();
    await page.getByRole('button', { name: 'Create Deck' }).click();
    await page.getByLabel('Name').fill('Deck to Edit');
    await page.getByLabel('Description').fill('Original description');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for deck page to load
    await expect(page.getByRole('heading', { name: 'Deck to Edit' })).toBeVisible();
    
    // Step 1: Click edit button or access edit functionality
    await page.getByRole('button', { name: 'Edit Deck' }).click();
    
    // Step 2: Update deck details
    await page.getByLabel('Name').fill('Updated Deck Name');
    await page.getByLabel('Description').fill('Updated description after editing');
    
    // Step 3: Save changes
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Expected Result: Deck is updated
    await expect(page.getByRole('heading', { name: 'Updated Deck Name' })).toBeVisible();
    await expect(page.getByText('Updated description after editing')).toBeVisible();
  });

  test('User can delete a deck', async ({ page }) => {
    // First create a deck
    await page.getByRole('link', { name: 'Decks' }).click();
    await page.getByRole('button', { name: 'Create Deck' }).click();
    await page.getByLabel('Name').fill('Deck to Delete');
    await page.getByLabel('Description').fill('This deck will be deleted');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await expect(page.getByRole('heading', { name: 'Deck to Delete' })).toBeVisible();
    
    // Step 1: Access delete functionality
    await page.getByRole('button', { name: 'Delete Deck' }).click();
    
    // Step 2: Confirm deletion in modal/dialog
    await expect(page.getByText('Are you sure you want to delete this deck?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Expected Result: User is redirected to decks page and deck is gone
    await expect(page).toHaveURL('/decks');
    await expect(page.getByText('Deck to Delete')).not.toBeVisible();
  });

  test('User can view deck statistics', async ({ page }) => {
    // Navigate to decks page
    await page.getByRole('link', { name: 'Decks' }).click();
    
    // If there are existing decks, click on one
    const deckCards = page.locator('[data-testid="deck-card"]');
    const deckCount = await deckCards.count();
    
    if (deckCount > 0) {
      await deckCards.first().click();
      
      // Verify statistics section is visible
      await expect(page.getByText('Statistics')).toBeVisible();
      
      // Verify basic stats are displayed (numbers may vary)
      await expect(page.locator('[data-testid="total-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="due-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-cards"]')).toBeVisible();
    } else {
      // Create a deck first if none exist
      await page.getByRole('button', { name: 'Create Deck' }).click();
      await page.getByLabel('Name').fill('Stats Test Deck');
      await page.getByLabel('Description').fill('For testing statistics');
      await page.getByRole('button', { name: 'Create' }).click();
      
      await expect(page.getByText('0 cards')).toBeVisible();
    }
  });
});