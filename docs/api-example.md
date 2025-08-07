# API Key Usage Examples

## Authentication

All API requests must include your API key in the Authorization header:

```bash
Authorization: Bearer ank_YOUR_API_KEY_HERE
```

## API Endpoints

### 1. List Decks

```bash
# List all decks
curl -X GET http://localhost:3000/api/v1/decks \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE"

# List decks with pagination
curl -X GET "http://localhost:3000/api/v1/decks?limit=10&offset=0" \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE"
```

### 2. Create a Deck

```bash
curl -X POST http://localhost:3000/api/v1/decks \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spanish Vocabulary",
    "description": "Common Spanish words and phrases",
    "isPublic": false
  }'
```

### 3. Batch Add Cards

```bash
# Add basic cards
curl -X POST http://localhost:3000/api/v1/decks/{deckId}/cards/batch \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "cards": [
      {
        "front": "Hello",
        "back": "Hola",
        "cardType": "BASIC",
        "tags": ["greetings", "common"]
      },
      {
        "front": "Goodbye",
        "back": "Adiós",
        "cardType": "BASIC",
        "tags": ["greetings", "common"]
      }
    ]
  }'

# Add cloze cards
curl -X POST http://localhost:3000/api/v1/decks/{deckId}/cards/batch \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "cards": [
      {
        "front": "Spanish cloze example",
        "back": "The answer",
        "cardType": "CLOZE",
        "clozeText": "The capital of {{c1::Spain}} is {{c2::Madrid}}"
      }
    ]
  }'
```

### 4. Get Review Queue

```bash
# Get cards due for review
curl -X GET http://localhost:3000/api/v1/study/queue \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE"

# Get cards from specific deck
curl -X GET "http://localhost:3000/api/v1/study/queue?deckId={deckId}&limit=20" \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE"

# Get only new cards
curl -X GET "http://localhost:3000/api/v1/study/queue?includeNew=true&includeLearning=false&includeReview=false" \
  -H "Authorization: Bearer ank_YOUR_API_KEY_HERE"
```

## Rate Limits

The API includes rate limiting headers in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-01-08T12:00:00.000Z
```

- Default endpoints: 1000 requests/hour
- Batch endpoints: 100 requests/hour

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional context
    }
  }
}
```

Common error codes:
- `INVALID_API_KEY`: API key is invalid or revoked
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Request data validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `PERMISSION_DENIED`: User lacks permission for resource
- `INTERNAL_ERROR`: Server-side error

## Python Example

```python
import requests

API_KEY = "ank_YOUR_API_KEY_HERE"
BASE_URL = "http://localhost:3000/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# List decks
response = requests.get(f"{BASE_URL}/decks", headers=headers)
decks = response.json()

# Create a deck
new_deck = {
    "name": "Python Programming",
    "description": "Python concepts and syntax"
}
response = requests.post(f"{BASE_URL}/decks", json=new_deck, headers=headers)
deck = response.json()

# Add cards
cards_data = {
    "cards": [
        {
            "front": "What is a list comprehension?",
            "back": "A concise way to create lists in Python: [x for x in range(10)]",
            "cardType": "BASIC"
        }
    ]
}
response = requests.post(
    f"{BASE_URL}/decks/{deck['id']}/cards/batch", 
    json=cards_data, 
    headers=headers
)
```

## JavaScript/TypeScript Example

```javascript
const API_KEY = "ank_YOUR_API_KEY_HERE";
const BASE_URL = "http://localhost:3000/api/v1";

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};

// List decks
async function listDecks() {
  const response = await fetch(`${BASE_URL}/decks`, { headers });
  return response.json();
}

// Create a deck
async function createDeck(name, description) {
  const response = await fetch(`${BASE_URL}/decks`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, description })
  });
  return response.json();
}

// Add cards
async function addCards(deckId, cards) {
  const response = await fetch(`${BASE_URL}/decks/${deckId}/cards/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cards })
  });
  return response.json();
}

// Get review queue
async function getReviewQueue(deckId) {
  const url = deckId 
    ? `${BASE_URL}/study/queue?deckId=${deckId}`
    : `${BASE_URL}/study/queue`;
  const response = await fetch(url, { headers });
  return response.json();
}
```