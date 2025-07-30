# Anki Flashcard Application - Test Cases

## Overview
This document outlines comprehensive test cases for the Anki flashcard application built with Next.js 15, covering all major features including authentication, deck management, card creation, study sessions, and statistics.

## Test Environment Setup
- **Base URL**: http://localhost:3000
- **Test Account**: test@example.com / password123
- **Database**: PostgreSQL with seeded test data
- **Browser**: Chrome (latest)

## Authentication Test Cases

### TC-001: User Login
**Objective**: Verify user can successfully log in with valid credentials
**Steps**:
1. Navigate to http://localhost:3000/login
2. Enter email: test@example.com
3. Enter password: password123
4. Click "Sign In" button
**Expected Result**: User is redirected to dashboard (/decks)
**Priority**: High

### TC-002: Invalid Login
**Objective**: Verify proper error handling for invalid credentials
**Steps**:
1. Navigate to http://localhost:3000/login
2. Enter email: invalid@example.com
3. Enter password: wrongpassword
4. Click "Sign In" button
**Expected Result**: Error message displayed, user remains on login page
**Priority**: High

### TC-003: User Logout
**Objective**: Verify user can successfully log out
**Steps**:
1. Log in as test user
2. Click on user menu in sidebar
3. Click "Sign Out"
**Expected Result**: User is redirected to login page, session cleared
**Priority**: Medium

## Deck Management Test Cases

### TC-004: View Decks List
**Objective**: Verify user can view their decks
**Steps**:
1. Log in as test user
2. Navigate to /decks (should be default after login)
**Expected Result**: 
- See list of 3 test decks: "Spanish Vocabulary", "Math Formulas", "World History"
- Each deck shows name, description, card count
- Deck actions (Edit, Study, View Stats) are visible
**Priority**: High

### TC-005: Create New Deck
**Objective**: Verify user can create a new deck
**Steps**:
1. From decks page, click "Create New Deck" button
2. Enter name: "Test Deck"
3. Enter description: "This is a test deck"
4. Toggle "Public Deck" option
5. Click "Create Deck" button
**Expected Result**: 
- New deck is created and visible in decks list
- User is redirected to new deck's cards page
- Deck shows correct name, description, and public status
**Priority**: High

### TC-006: Edit Deck
**Objective**: Verify user can edit existing deck
**Steps**:
1. From decks list, click three-dot menu on "Spanish Vocabulary" deck
2. Click "Edit Deck"
3. Change name to "Spanish Vocabulary Updated"
4. Change description
5. Toggle public/private setting
6. Click "Update Deck"
**Expected Result**: 
- Deck information is updated
- Changes are reflected in decks list
- User is redirected back to deck cards page
**Priority**: Medium

### TC-007: Delete Deck
**Objective**: Verify user can delete a deck
**Steps**:
1. Create a test deck (use TC-005)
2. Go to deck edit page
3. Scroll to "Danger Zone" section
4. Click "Delete Deck" button
5. Confirm deletion in modal
**Expected Result**: 
- Deck is deleted from database
- User is redirected to decks list
- Deleted deck no longer appears in list
**Priority**: Medium

## Card Management Test Cases

### TC-008: View Cards in Deck
**Objective**: Verify user can view cards within a deck
**Steps**:
1. From decks list, click on "Spanish Vocabulary" deck
2. Verify cards page loads
**Expected Result**: 
- See list of cards with front/back content
- See card types (Basic/Cloze) indicated
- See tags for each card
- Card actions (Edit, Delete) are available
**Priority**: High

### TC-009: Create Basic Card
**Objective**: Verify user can create a basic flashcard
**Steps**:
1. Navigate to a deck's cards page
2. Click "Add Card" button
3. Ensure "Basic" card type is selected
4. Enter front: "What is the capital of France?"
5. Enter back: "Paris"
6. Add tags: "geography", "capitals"
7. Click "Create Card"
**Expected Result**: 
- Card is created and appears in cards list
- Card shows correct front/back content
- Tags are displayed correctly
**Priority**: High

### TC-010: Create Cloze Card
**Objective**: Verify user can create a cloze deletion card
**Steps**:
1. Navigate to a deck's cards page
2. Click "Add Card" button
3. Select "Cloze Deletion" card type
4. Enter cloze text: "The capital of {{c1::France}} is {{c2::Paris}}"
5. Add additional context in front field (optional)
6. Add tags: "geography", "cloze"
7. Click "Create Card"
**Expected Result**: 
- Cloze card is created
- Preview shows cloze deletions properly formatted
- Card appears in cards list with cloze indicator
**Priority**: High

### TC-011: Edit Card
**Objective**: Verify user can edit existing cards
**Steps**:
1. From cards list, click three-dot menu on any card
2. Click "Edit Card"
3. Modify front content using rich text editor
4. Add formatting (bold, italic, colors)
5. Update tags
6. Click "Update Card"
**Expected Result**: 
- Card content is updated
- Rich text formatting is preserved
- Changes are reflected in cards list
**Priority**: Medium

### TC-012: Delete Card
**Objective**: Verify user can delete cards
**Steps**:
1. From cards list, click three-dot menu on a card
2. Click "Delete" option
3. Confirm deletion in modal
**Expected Result**: 
- Card is removed from cards list
- Card is deleted from database
**Priority**: Medium

## Rich Text Editor Test Cases

### TC-013: Rich Text Formatting
**Objective**: Verify rich text editor functionality
**Steps**:
1. Create or edit a card
2. In the front/back field, test each formatting option:
   - Bold text
   - Italic text
   - Strikethrough
   - Code formatting
   - Bullet lists
   - Numbered lists
   - Blockquotes
   - Links
   - Text colors
   - Highlights
3. Save the card
**Expected Result**: 
- All formatting options work correctly
- Formatted content is preserved after saving
- Content displays properly in card preview
**Priority**: Medium

## Study Session Test Cases

### TC-014: Start Global Study Session
**Objective**: Verify user can start a study session with all decks
**Steps**:
1. Navigate to /study
2. Verify due cards count is displayed
3. Click "Start Study Session" button
4. Verify study interface loads
**Expected Result**: 
- Study session begins with available cards
- Progress bar shows current position
- Card content displays correctly
**Priority**: High

### TC-015: Study Basic Card
**Objective**: Verify basic card study flow
**Steps**:
1. Start study session (TC-014)
2. When a basic card appears:
   - Read the front content
   - Click "Show Answer" or press Space
   - Verify back content appears
   - Click rating button (Again/Hard/Good/Easy) or press 1/2/3/4
**Expected Result**: 
- Answer is revealed correctly
- Rating buttons are functional
- Next card loads after rating
- Session statistics update
**Priority**: High

### TC-016: Study Cloze Card
**Objective**: Verify cloze deletion card study flow
**Steps**:
1. Start study session and wait for cloze card
2. Read the cloze text with blanks
3. Click "Show Answer" or press Space
4. Verify cloze deletions are revealed
5. Rate the card difficulty
**Expected Result**: 
- Cloze deletions display correctly (blanks then reveals)
- Additional context displays if available
- Rating functionality works
**Priority**: High

### TC-017: Deck-Specific Study
**Objective**: Verify user can study a specific deck
**Steps**:
1. Navigate to a deck's cards page
2. Click "Study This Deck" button
3. Verify study session starts with only that deck's cards
4. Complete a few card reviews
**Expected Result**: 
- Only cards from selected deck appear
- Study statistics are deck-specific
- Session completion shows deck-specific results
**Priority**: Medium

### TC-018: Study Session Controls
**Objective**: Verify study session pause/resume functionality
**Steps**:
1. Start any study session
2. Click pause button during study
3. Verify session is paused
4. Click resume button
5. End session early using "End Session" button
**Expected Result**: 
- Pause/resume functionality works correctly
- Session can be ended early
- Progress is maintained during pause
**Priority**: Low

## Import/Export Test Cases

### TC-019: Export Deck
**Objective**: Verify deck export functionality
**Steps**:
1. Navigate to a deck's cards page
2. Click "Export Deck" button
3. Verify JSON file download starts
4. Open downloaded file and verify structure
**Expected Result**: 
- JSON file downloads successfully
- File contains deck and card data in correct format
- All card types and content are preserved
**Priority**: Medium

### TC-020: Import Deck
**Objective**: Verify deck import functionality
**Steps**:
1. Navigate to /decks
2. Click "Import Deck" button
3. Upload the JSON file from TC-019
4. Follow import wizard steps
5. Confirm import
**Expected Result**: 
- Import wizard guides through process
- File is validated correctly
- New deck is created with all cards
- Import preserves all content and formatting
**Priority**: Medium

### TC-021: Invalid Import File
**Objective**: Verify proper handling of invalid import files
**Steps**:
1. Navigate to import page
2. Upload an invalid JSON file or non-JSON file
3. Attempt to proceed with import
**Expected Result**: 
- Validation error messages appear
- Import does not proceed with invalid data
- User is informed of specific issues
**Priority**: Low

## Statistics Test Cases

### TC-022: Global Statistics
**Objective**: Verify global statistics page functionality
**Steps**:
1. Navigate to /stats
2. Verify different time periods (Today, Week, Month, All)
3. Check different tabs (Overview, Activity, Performance, Insights)
4. Verify charts and metrics are displayed
**Expected Result**: 
- All statistics load correctly
- Charts display data appropriately
- Time period filtering works
- All tabs contain relevant information
**Priority**: Medium

### TC-023: Deck Statistics
**Objective**: Verify deck-specific statistics
**Steps**:
1. Navigate to a deck's cards page
2. Click "View Stats" button
3. Verify deck-specific statistics load
4. Test time period filters
5. Check all tabs for deck-specific data
**Expected Result**: 
- Deck statistics show only data for that deck
- Charts and metrics are deck-specific
- All functionality works as in global stats
**Priority**: Medium

## Mobile Responsiveness Test Cases

### TC-024: Mobile Navigation
**Objective**: Verify app works on mobile viewport
**Steps**:
1. Set browser to mobile viewport (375x667)
2. Navigate through main pages
3. Test sidebar navigation
4. Verify touch interactions work
**Expected Result**: 
- App is responsive on mobile
- Navigation is accessible
- Touch targets are appropriate size
- Content is readable and usable
**Priority**: Medium

### TC-025: Mobile Study Session
**Objective**: Verify study sessions work on mobile
**Steps**:
1. Use mobile viewport
2. Start study session
3. Test touch interactions for showing answers
4. Test touch ratings for cards
**Expected Result**: 
- Study interface is mobile-friendly
- Touch interactions work correctly
- Content is properly sized for mobile
**Priority**: Medium

## Performance Test Cases

### TC-026: Page Load Times
**Objective**: Verify acceptable page load performance
**Steps**:
1. Clear browser cache
2. Navigate to main pages and measure load times
3. Check for any console errors
4. Verify images and assets load properly
**Expected Result**: 
- Pages load within reasonable time (< 3 seconds)
- No JavaScript errors in console
- All assets load correctly
**Priority**: Low

### TC-027: Large Deck Performance
**Objective**: Verify app handles large numbers of cards
**Steps**:
1. Create a deck with 100+ cards (or use import)
2. Navigate cards list
3. Start study session
4. Test search and filtering functionality
**Expected Result**: 
- App remains responsive with large datasets
- Pagination or virtualization works if implemented
- Search and filters perform adequately
**Priority**: Low

## Security Test Cases

### TC-028: Authentication Protection
**Objective**: Verify protected routes require authentication
**Steps**:
1. Log out of application
2. Try to directly access protected URLs:
   - /decks
   - /study
   - /stats
   - /decks/[id]/cards
**Expected Result**: 
- All protected routes redirect to login page
- No sensitive data is accessible without authentication
**Priority**: High

### TC-029: Data Isolation
**Objective**: Verify users can only access their own data
**Steps**:
1. Log in as test user
2. Note deck IDs in URL
3. Try to access another user's deck (if test data exists)
4. Verify proper authorization
**Expected Result**: 
- Users cannot access data belonging to other users
- Proper error messages for unauthorized access
**Priority**: High

## Error Handling Test Cases

### TC-030: Network Error Handling
**Objective**: Verify app handles network issues gracefully
**Steps**:
1. Start study session
2. Simulate network disconnection (dev tools offline mode)
3. Try to rate a card
4. Reconnect network
**Expected Result**: 
- Appropriate error messages shown
- App provides retry mechanisms
- No data loss occurs
**Priority**: Low

### TC-031: Invalid Data Handling
**Objective**: Verify app handles corrupted or invalid data
**Steps**:
1. Try to create cards with very long content
2. Test with special characters and emoji
3. Test with malformed HTML in rich text
**Expected Result**: 
- App validates input appropriately
- Displays helpful error messages
- Prevents data corruption
**Priority**: Low

## Accessibility Test Cases

### TC-032: Keyboard Navigation
**Objective**: Verify app is accessible via keyboard
**Steps**:
1. Navigate app using only keyboard (Tab, Enter, Space, Arrow keys)
2. Test study session keyboard shortcuts
3. Verify all interactive elements are reachable
**Expected Result**: 
- All functionality accessible via keyboard
- Focus indicators are visible
- Tab order is logical
**Priority**: Low

### TC-033: Screen Reader Compatibility
**Objective**: Verify app works with screen readers
**Steps**:
1. Use screen reader to navigate app
2. Check that all content is properly announced
3. Verify form labels and button descriptions
**Expected Result**: 
- Content is properly structured for screen readers
- All interactive elements have appropriate labels
- App is usable with assistive technology
**Priority**: Low

## Data Persistence Test Cases

### TC-034: Session Persistence
**Objective**: Verify study progress is maintained
**Steps**:
1. Start study session
2. Complete several cards
3. Refresh the page
4. Check if progress is maintained
**Expected Result**: 
- Study progress is saved
- Session statistics are preserved
- User can continue where they left off
**Priority**: Medium

### TC-035: Card State Persistence
**Objective**: Verify card learning states are maintained
**Steps**:
1. Study several cards with different ratings
2. Check card states in database/UI
3. Start new study session
4. Verify due dates and intervals are correct
**Expected Result**: 
- Card states are properly updated
- Spaced repetition algorithm works correctly
- Due dates are calculated properly
**Priority**: High

## Test Execution Notes

### Pre-Test Setup
1. Ensure development server is running on http://localhost:3000
2. Database should be seeded with test data using `pnpm run db:seed`
3. Clear browser cache and cookies before testing
4. Use browser dev tools for debugging any issues

### Test Data Requirements
- Test user account (test@example.com / password123)
- Sample decks with various card types
- Some cards with review history for statistics testing

### Issue Tracking
When executing these test cases, document any issues found with:
- Test case ID
- Steps to reproduce
- Expected vs actual result
- Screenshots if applicable
- Browser and environment details
- Severity level (Critical/High/Medium/Low)

### Success Criteria
- All High priority test cases must pass
- Medium priority test cases should have 90%+ pass rate
- Low priority test cases should have 80%+ pass rate
- No critical security or data loss issues

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Author**: QA Playwright Tester  
**Next Review**: After each major feature release