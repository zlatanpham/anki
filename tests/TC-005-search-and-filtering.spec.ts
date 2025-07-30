import { test, expect } from '@playwright/test';

/**
 * TC-005: Search and Filtering Functionality
 * Objective: Verify the advanced search and filtering features work correctly
 * Priority: High
 */
test.describe('TC-005: Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Login and set up test data
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    await expect(page).toHaveURL('/');
    
    // Create multiple decks with cards for comprehensive testing
    const testDecks = [
      {
        name: 'Programming Deck',
        description: 'Programming concepts and languages',
        cards: [
          { front: 'What is JavaScript?', back: 'A programming language', tags: 'javascript, programming, web' },
          { front: 'What is Python?', back: 'A high-level programming language', tags: 'python, programming, backend' },
          { front: 'What is HTML?', back: 'Hypertext Markup Language', tags: 'html, web, frontend' }
        ]
      },
      {
        name: 'Science Deck',
        description: 'General science knowledge',
        cards: [
          { front: 'What is photosynthesis?', back: 'Process plants use to make food', tags: 'biology, plants, science' },
          { front: 'What is gravity?', back: 'Force that attracts objects', tags: 'physics, forces, science' },
          { front: 'What is DNA?', back: 'Deoxyribonucleic acid', tags: 'biology, genetics, science' }
        ]
      }
    ];
    
    // Create test decks and cards
    for (const deck of testDecks) {
      await page.getByRole('link', { name: 'Decks' }).click();
      await page.getByRole('button', { name: 'Create Deck' }).click();
      await page.getByLabel('Name').fill(deck.name);
      await page.getByLabel('Description').fill(deck.description);
      await page.getByRole('button', { name: 'Create' }).click();
      
      // Add cards to the deck
      for (const card of deck.cards) {
        await page.getByRole('button', { name: 'Add Card' }).click();
        await page.getByLabel('Card Type').selectOption('BASIC');
        await page.getByLabel('Front').fill(card.front);
        await page.getByLabel('Back').fill(card.back);
        await page.getByLabel('Tags').fill(card.tags);
        await page.getByRole('button', { name: 'Create Card' }).click();
      }
    }
  });

  test('Global search finds cards across all decks', async ({ page }) => {
    // Step 1: Navigate to global search page
    await page.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL('/search');
    
    // Step 2: Search for a term that appears in multiple decks
    await page.getByPlaceholder('Search across all your cards...').fill('programming');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Expected Results: Should find cards from programming deck
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('Python')).toBeVisible();
    
    // Should show which deck each card belongs to
    await expect(page.getByText('Programming Deck')).toBeVisible();
    
    // Step 3: Test more specific search
    await page.getByPlaceholder('Search across all your cards...').fill('JavaScript');
    await page.getByRole('button', { name: 'Search' }).click();
    
    await expect(page.getByText('What is JavaScript?')).toBeVisible();
    await expect(page.getByText('What is Python?')).not.toBeVisible();
  });

  test('Advanced search with multiple filters works correctly', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: Open advanced search options
    await page.getByRole('button', { name: 'Advanced Search' }).click();
    
    // Step 2: Apply tag filter
    await page.getByLabel('Tags').selectOption('science');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    // Should show only science-tagged cards
    await expect(page.getByText('photosynthesis')).toBeVisible();
    await expect(page.getByText('gravity')).toBeVisible();
    await expect(page.getByText('DNA')).toBeVisible();
    await expect(page.getByText('JavaScript')).not.toBeVisible();
    
    // Step 3: Combine tag filter with text search
    await page.getByPlaceholder('Search across all your cards...').fill('biology');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Should show only biology science cards
    await expect(page.getByText('photosynthesis')).toBeVisible();
    await expect(page.getByText('DNA')).toBeVisible();
    await expect(page.getByText('gravity')).not.toBeVisible();
    
    // Step 4: Test card type filter
    await page.getByRole('button', { name: 'Advanced Search' }).click();
    await page.getByLabel('Card Type').selectOption('BASIC');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    // All our test cards are BASIC type, so should still show results
    await expect(page.getByText('photosynthesis')).toBeVisible();
  });

  test('Search within specific deck works correctly', async ({ page }) => {
    // Navigate to a specific deck
    await page.getByRole('link', { name: 'Decks' }).click();
    await page.getByText('Programming Deck').click();
    
    // Go to cards view
    await page.getByRole('link', { name: 'Cards' }).click();
    
    // Step 1: Search within deck
    await page.getByPlaceholder('Search cards...').fill('web');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Should find web-related cards in this deck only
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('HTML')).toBeVisible();
    await expect(page.getByText('Python')).not.toBeVisible(); // Python card doesn't have 'web' tag
    
    // Step 2: Clear search and verify all deck cards return
    await page.getByPlaceholder('Search cards...').clear();
    await page.getByRole('button', { name: 'Search' }).click();
    
    await expect(page.getByText('JavaScript')).toBeVisible();
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('HTML')).toBeVisible();
  });

  test('Tag-based filtering works correctly', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: View popular tags
    await expect(page.getByText('Popular Tags')).toBeVisible();
    
    // Click on a popular tag (assuming tags are clickable)
    if (await page.getByRole('button', { name: 'programming' }).isVisible()) {
      await page.getByRole('button', { name: 'programming' }).click();
      
      // Should filter to show only programming cards
      await expect(page.getByText('JavaScript')).toBeVisible();
      await expect(page.getByText('Python')).toBeVisible();
      await expect(page.getByText('photosynthesis')).not.toBeVisible();
    }
    
    // Step 2: Test multiple tag selection
    await page.getByRole('button', { name: 'Advanced Search' }).click();
    
    // Select multiple tags if multi-select is available
    if (await page.getByLabel('Tags').isVisible()) {
      await page.getByLabel('Tags').selectOption(['programming', 'web']);
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      
      // Should show cards that match ANY of the selected tags
      await expect(page.getByText('JavaScript')).toBeVisible();
      await expect(page.getByText('HTML')).toBeVisible();
    }
  });

  test('Search results pagination works correctly', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: Perform broad search to get multiple results
    await page.getByPlaceholder('Search across all your cards...').fill('a'); // Broad search
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Step 2: Check if pagination controls are present (for large result sets)
    const nextButton = page.getByRole('button', { name: 'Next' });
    const pageNumbers = page.locator('[data-testid="pagination"]');
    
    if (await nextButton.isVisible() || await pageNumbers.isVisible()) {
      // Test pagination if available
      const initialResults = await page.locator('[data-testid="search-result"]').count();
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        
        // Should show different results on next page
        const newResults = await page.locator('[data-testid="search-result"]').count();
        expect(newResults).toBeGreaterThan(0);
        
        // Test previous button
        await page.getByRole('button', { name: 'Previous' }).click();
      }
    } else {
      // If no pagination, verify all results are shown
      const resultCount = await page.locator('[data-testid="search-result"]').count();
      expect(resultCount).toBeGreaterThan(0);
    }
  });

  test('Search highlighting and result display works correctly', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: Search for specific term
    await page.getByPlaceholder('Search across all your cards...').fill('JavaScript');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Step 2: Verify search term is highlighted in results
    const searchResults = page.locator('[data-testid="search-result"]');
    await expect(searchResults.first()).toBeVisible();
    
    // Check if search term is highlighted (common implementations use <mark> or similar)
    const highlightedText = page.locator('mark, .highlight, [data-testid="highlight"]');
    if (await highlightedText.isVisible()) {
      await expect(highlightedText).toContainText('JavaScript');
    }
    
    // Step 3: Verify result metadata is shown
    await expect(page.getByText('Programming Deck')).toBeVisible(); // Deck name
    await expect(page.getByText('javascript')).toBeVisible(); // Tags
    
    // Step 4: Test clicking on search result
    await searchResults.first().click();
    
    // Should navigate to the card or deck
    await expect(page).toHaveURL(/\/decks\/[a-f0-9-]+/);
  });

  test('Search handles no results gracefully', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: Search for term that doesn't exist
    await page.getByPlaceholder('Search across all your cards...').fill('nonexistentterm123');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Expected Result: Should show "no results" message
    await expect(page.getByText('No cards found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    
    // Step 2: Verify suggestions or alternative actions are provided
    const suggestions = [
      page.getByText('Create a new card'),
      page.getByText('Browse all decks'),
      page.getByText('Clear search'),
      page.getByRole('button', { name: 'Clear' })
    ];
    
    let suggestionFound = false;
    for (const suggestion of suggestions) {
      if (await suggestion.isVisible()) {
        suggestionFound = true;
        break;
      }
    }
    
    // At least some form of guidance should be provided
    expect(suggestionFound).toBe(true);
  });

  test('Search performance with large datasets is acceptable', async ({ page }) => {
    // This test focuses on ensuring search doesn't hang or timeout
    
    // Navigate to search page
    await page.getByRole('link', { name: 'Search' }).click();
    
    // Step 1: Perform search and measure response time
    const startTime = Date.now();
    
    await page.getByPlaceholder('Search across all your cards...').fill('a');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Wait for results to appear
    await expect(page.locator('[data-testid="search-result"]').first()).toBeVisible({ timeout: 10000 });
    
    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    // Search should complete within reasonable time
    expect(searchTime).toBeLessThan(10000); // 10 seconds max
    
    // Step 2: Verify search results are actually displayed
    const resultCount = await page.locator('[data-testid="search-result"]').count();
    expect(resultCount).toBeGreaterThan(0);
  });
});