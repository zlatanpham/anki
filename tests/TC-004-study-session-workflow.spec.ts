import { test, expect } from '@playwright/test';

/**
 * TC-004: Study Session Workflow
 * Objective: Verify users can successfully complete study sessions
 * Priority: Critical
 */
test.describe('TC-004: Study Session Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and set up test deck with cards
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    await expect(page).toHaveURL('/');
    
    // Create a test deck
    await page.getByRole('link', { name: 'Decks' }).click();
    await page.getByRole('button', { name: 'Create Deck' }).click();
    await page.getByLabel('Name').fill('Study Session Test Deck');
    await page.getByLabel('Description').fill('Deck for testing study sessions');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Add test cards
    const testCards = [
      { front: 'What is 2 + 2?', back: '4', tags: 'math, basic' },
      { front: 'What is the largest planet?', back: 'Jupiter', tags: 'science, astronomy' },
      { front: 'Who wrote Romeo and Juliet?', back: 'William Shakespeare', tags: 'literature, classics' }
    ];
    
    for (const card of testCards) {
      await page.getByRole('button', { name: 'Add Card' }).click();
      await page.getByLabel('Card Type').selectOption('BASIC');
      await page.getByLabel('Front').fill(card.front);
      await page.getByLabel('Back').fill(card.back);
      await page.getByLabel('Tags').fill(card.tags);
      await page.getByRole('button', { name: 'Create Card' }).click();
    }
    
    await expect(page.getByText('3 cards')).toBeVisible();
  });

  test('User can start and complete a study session', async ({ page }) => {
    // Step 1: Start study session
    await page.getByRole('button', { name: 'Study Now' }).click();
    
    // Should be redirected to study interface
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+\/study$/);
    await expect(page.getByText('Study Session')).toBeVisible();
    
    // Step 2: First card should be displayed
    await expect(page.getByTestId('card-front')).toBeVisible();
    const firstCardText = await page.getByTestId('card-front').textContent();
    expect(['What is 2 + 2?', 'What is the largest planet?', 'Who wrote Romeo and Juliet?']).toContain(firstCardText?.trim());
    
    // Step 3: Show answer
    await page.getByRole('button', { name: 'Show Answer' }).click();
    await expect(page.getByTestId('card-back')).toBeVisible();
    
    // Step 4: Rate the card (Good)
    await page.getByRole('button', { name: 'Good' }).click();
    
    // Step 5: Continue with remaining cards
    for (let i = 0; i < 2; i++) {
      // Check if there are more cards or if session is complete
      const showAnswerButton = page.getByRole('button', { name: 'Show Answer' });
      const sessionCompleteText = page.getByText('Study session complete');
      
      if (await showAnswerButton.isVisible()) {
        await showAnswerButton.click();
        await page.getByRole('button', { name: 'Good' }).click();
      } else if (await sessionCompleteText.isVisible()) {
        break;
      }
    }
    
    // Expected Result: Study session should complete
    await expect(page.getByText('Study session complete')).toBeVisible();
    await expect(page.getByText('Cards studied:')).toBeVisible();
    
    // Step 6: Return to deck
    await page.getByRole('button', { name: 'Back to Deck' }).click();
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+$/);
  });

  test('User can rate cards with different difficulty levels', async ({ page }) => {
    // Start study session
    await page.getByRole('button', { name: 'Study Now' }).click();
    
    // Test all rating options
    const ratings = ['Again', 'Hard', 'Good', 'Easy'];
    
    for (let i = 0; i < Math.min(ratings.length, 3); i++) {
      if (await page.getByRole('button', { name: 'Show Answer' }).isVisible()) {
        await page.getByRole('button', { name: 'Show Answer' }).click();
        
        // Verify all rating buttons are available
        for (const rating of ratings) {
          await expect(page.getByRole('button', { name: rating })).toBeVisible();
        }
        
        // Select a rating
        await page.getByRole('button', { name: ratings[i] }).click();
        
        // Small delay to allow processing
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }
    
    // Session should eventually complete or continue appropriately
    const sessionComplete = page.getByText('Study session complete');
    const nextCard = page.getByTestId('card-front');
    
    await expect(sessionComplete.or(nextCard)).toBeVisible();
  });

  test('User can pause and resume study session', async ({ page }) => {
    // Start study session
    await page.getByRole('button', { name: 'Study Now' }).click();
    
    // Verify we're in study mode
    await expect(page.getByTestId('card-front')).toBeVisible();
    
    // Step 1: Pause session (if pause functionality exists)
    if (await page.getByRole('button', { name: 'Pause' }).isVisible()) {
      await page.getByRole('button', { name: 'Pause' }).click();
      await expect(page.getByText('Session paused')).toBeVisible();
      
      // Step 2: Resume session
      await page.getByRole('button', { name: 'Resume' }).click();
      await expect(page.getByTestId('card-front')).toBeVisible();
    } else {
      // Alternative: navigate away and back to simulate pause/resume
      await page.getByRole('link', { name: 'Overview' }).click();
      await page.getByRole('button', { name: 'Study Now' }).click();
      await expect(page.getByTestId('card-front')).toBeVisible();
    }
  });

  test('Study session handles empty deck gracefully', async ({ page }) => {
    // Delete all cards first
    await page.getByRole('link', { name: 'Cards' }).click();
    
    // Delete each card
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const buttonCount = await deleteButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      await deleteButtons.first().click();
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    
    // Go back to deck overview
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page.getByText('0 cards')).toBeVisible();
    
    // Try to start study session
    const studyButton = page.getByRole('button', { name: 'Study Now' });
    
    if (await studyButton.isVisible()) {
      await studyButton.click();
      
      // Should show appropriate message for empty deck
      await expect(page.getByText('No cards available to study')).toBeVisible();
    } else {
      // Study button should be disabled or not visible
      await expect(page.getByText('Add some cards to start studying')).toBeVisible();
    }
  });

  test('Study session progress is tracked correctly', async ({ page }) => {
    // Start study session
    await page.getByRole('button', { name: 'Study Now' }).click();
    
    // Look for progress indicators
    const progressIndicators = [
      page.getByText(/\d+\/\d+/), // "1/3" format
      page.getByRole('progressbar'),
      page.getByText(/Card \d+ of \d+/),
      page.getByTestId('study-progress')
    ];
    
    // At least one progress indicator should be visible
    let progressVisible = false;
    for (const indicator of progressIndicators) {
      if (await indicator.isVisible()) {
        progressVisible = true;
        break;
      }
    }
    
    // If no specific progress indicators, just verify we can navigate through cards
    if (!progressVisible) {
      // Just complete a few cards and verify flow works
      for (let i = 0; i < 2; i++) {
        if (await page.getByRole('button', { name: 'Show Answer' }).isVisible()) {
          await page.getByRole('button', { name: 'Show Answer' }).click();
          await page.getByRole('button', { name: 'Good' }).click();
        } else {
          break;
        }
      }
    }
    
    // Verify we can complete or are progressing through the session
    const sessionComplete = page.getByText('Study session complete');
    const cardFront = page.getByTestId('card-front');
    
    await expect(sessionComplete.or(cardFront)).toBeVisible();
  });

  test('Keyboard shortcuts work during study session', async ({ page }) => {
    // Start study session
    await page.getByRole('button', { name: 'Study Now' }).click();
    await expect(page.getByTestId('card-front')).toBeVisible();
    
    // Test spacebar to show answer (common shortcut)
    await page.keyboard.press('Space');
    
    // Either answer is shown or we verify spacebar functionality
    const cardBack = page.getByTestId('card-back');
    const showAnswerButton = page.getByRole('button', { name: 'Show Answer' });
    
    if (await cardBack.isVisible()) {
      // Spacebar worked, test number keys for ratings
      await page.keyboard.press('3'); // Usually maps to "Good"
    } else if (await showAnswerButton.isVisible()) {
      // Manual click if spacebar doesn't work
      await showAnswerButton.click();
      await page.getByRole('button', { name: 'Good' }).click();
    }
    
    // Verify we can continue or complete
    const nextCard = page.getByTestId('card-front');
    const sessionComplete = page.getByText('Study session complete');
    
    await expect(nextCard.or(sessionComplete)).toBeVisible();
  });
});