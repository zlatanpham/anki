import { test, expect } from '@playwright/test';

/**
 * TC-003: Card Creation and Editing
 * Objective: Verify users can create, edit, and manage flashcards
 * Priority: High
 */
test.describe('TC-003: Card Creation and Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Login and create/navigate to a test deck
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    await expect(page).toHaveURL('/');
    
    // Create a test deck for card operations
    await page.getByRole('link', { name: 'Decks' }).click();
    await page.getByRole('button', { name: 'Create Deck' }).click();
    await page.getByLabel('Name').fill('Card Test Deck');
    await page.getByLabel('Description').fill('Deck for testing card operations');
    await page.getByRole('button', { name: 'Create' }).click();
    
    await expect(page.getByRole('heading', { name: 'Card Test Deck' })).toBeVisible();
  });

  test('User can create a basic flashcard', async ({ page }) => {
    // Step 1: Click "Add Card" button
    await page.getByRole('button', { name: 'Add Card' }).click();
    
    // Step 2: Select card type (basic)
    await page.getByLabel('Card Type').selectOption('BASIC');
    
    // Step 3: Fill in front and back of card
    await page.getByLabel('Front').fill('What is the capital of France?');
    await page.getByLabel('Back').fill('Paris');
    
    // Step 4: Add tags (optional)
    await page.getByLabel('Tags').fill('geography, capitals, europe');
    
    // Step 5: Save the card
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Expected Result: Card is created and visible in deck
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+$/);
    await expect(page.getByText('1 card')).toBeVisible();
    
    // Navigate to cards view to verify card exists
    await page.getByRole('link', { name: 'Cards' }).click();
    await expect(page.getByText('What is the capital of France?')).toBeVisible();
    await expect(page.getByText('geography')).toBeVisible();
  });

  test('User can create a cloze deletion card', async ({ page }) => {
    // Step 1: Click "Add Card" button
    await page.getByRole('button', { name: 'Add Card' }).click();
    
    // Step 2: Select cloze card type
    await page.getByLabel('Card Type').selectOption('CLOZE');
    
    // Step 3: Fill in cloze text with deletion
    const clozeText = 'The {{c1::Python}} programming language was created by {{c2::Guido van Rossum}} in {{c3::1991}}.';
    await page.getByLabel('Cloze Text').fill(clozeText);
    
    // Step 4: Add tags
    await page.getByLabel('Tags').fill('programming, python, history');
    
    // Step 5: Save the card
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Expected Result: Card is created and visible
    await expect(page.getByText('1 card')).toBeVisible();
    
    // Verify card appears in cards list
    await page.getByRole('link', { name: 'Cards' }).click();
    await expect(page.getByText('The [...] programming language')).toBeVisible();
    await expect(page.getByText('programming')).toBeVisible();
  });

  test('User can edit an existing card', async ({ page }) => {
    // First create a card to edit
    await page.getByRole('button', { name: 'Add Card' }).click();
    await page.getByLabel('Card Type').selectOption('BASIC');
    await page.getByLabel('Front').fill('Original front text');
    await page.getByLabel('Back').fill('Original back text');
    await page.getByLabel('Tags').fill('original, test');
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Navigate to cards view
    await page.getByRole('link', { name: 'Cards' }).click();
    
    // Step 1: Click edit button on the card
    await page.getByRole('button', { name: 'Edit' }).first().click();
    
    // Step 2: Update card content
    await page.getByLabel('Front').fill('Updated front text');
    await page.getByLabel('Back').fill('Updated back text');
    await page.getByLabel('Tags').fill('updated, modified');
    
    // Step 3: Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Expected Result: Card is updated
    await expect(page.getByText('Updated front text')).toBeVisible();
    await expect(page.getByText('updated')).toBeVisible();
    await expect(page.getByText('Original front text')).not.toBeVisible();
  });

  test('User can delete a card', async ({ page }) => {
    // First create a card to delete
    await page.getByRole('button', { name: 'Add Card' }).click();
    await page.getByLabel('Card Type').selectOption('BASIC');
    await page.getByLabel('Front').fill('Card to delete');
    await page.getByLabel('Back').fill('This will be deleted');
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Navigate to cards view
    await page.getByRole('link', { name: 'Cards' }).click();
    
    // Step 1: Click delete button on the card
    await page.getByRole('button', { name: 'Delete' }).first().click();
    
    // Step 2: Confirm deletion
    await expect(page.getByText('Are you sure you want to delete this card?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Expected Result: Card is removed
    await expect(page.getByText('Card to delete')).not.toBeVisible();
    
    // Verify deck stats are updated
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page.getByText('0 cards')).toBeVisible();
  });

  test('User can filter and search cards', async ({ page }) => {
    // Create multiple cards for testing search/filter
    const cards = [
      { front: 'JavaScript Question', back: 'JavaScript Answer', tags: 'programming, js' },
      { front: 'Python Question', back: 'Python Answer', tags: 'programming, python' },
      { front: 'History Question', back: 'History Answer', tags: 'history, facts' }
    ];
    
    // Create cards
    for (const card of cards) {
      await page.getByRole('button', { name: 'Add Card' }).click();
      await page.getByLabel('Card Type').selectOption('BASIC');
      await page.getByLabel('Front').fill(card.front);
      await page.getByLabel('Back').fill(card.back);
      await page.getByLabel('Tags').fill(card.tags);
      await page.getByRole('button', { name: 'Create Card' }).click();
    }
    
    // Navigate to cards view
    await page.getByRole('link', { name: 'Cards' }).click();
    
    // Verify all cards are visible initially  
    await expect(page.getByText('3 cards')).toBeVisible();
    
    // Step 1: Test text search
    await page.getByPlaceholder('Search cards...').fill('JavaScript');
    await page.getByRole('button', { name: 'Search' }).click();
    
    await expect(page.getByText('JavaScript Question')).toBeVisible();
    await expect(page.getByText('Python Question')).not.toBeVisible();
    
    // Step 2: Clear search and test tag filter
    await page.getByPlaceholder('Search cards...').clear();
    await page.getByRole('button', { name: 'Advanced Search' }).click();
    
    // Select programming tag
    await page.getByLabel('Tags').selectOption('programming');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    await expect(page.getByText('JavaScript Question')).toBeVisible();
    await expect(page.getByText('Python Question')).toBeVisible();
    await expect(page.getByText('History Question')).not.toBeVisible();
  });

  test('Card form validation works correctly', async ({ page }) => {
    // Step 1: Try to create card without required fields
    await page.getByRole('button', { name: 'Add Card' }).click();
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Should show validation errors
    await expect(page.getByText('Front is required')).toBeVisible();
    await expect(page.getByText('Back is required')).toBeVisible();
    
    // Step 2: Test cloze card validation
    await page.getByLabel('Card Type').selectOption('CLOZE');
    await page.getByLabel('Cloze Text').fill('Text without cloze deletion');
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    await expect(page.getByText('Cloze text must contain at least one cloze deletion')).toBeVisible();
    
    // Step 3: Test valid cloze format
    await page.getByLabel('Cloze Text').fill('This has {{c1::valid}} cloze deletion');
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    // Should succeed
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+$/);
  });
});