"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ChevronDown, ChevronRight, Code2, Terminal, Info } from "lucide-react";
import { toast } from "sonner";

interface ApiExamplesProps {
  apiKey?: string;
}

interface Example {
  title: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  curl: string;
  python?: string;
  javascript?: string;
}

export function ApiExamples({ apiKey = "ank_YOUR_API_KEY_HERE" }: ApiExamplesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" 
    ? `${window.location.protocol}//${window.location.host}`
    : "http://localhost:3000";

  const examples: Example[] = [
    {
      title: "List All Decks",
      description: "Retrieve all decks in your account",
      method: "GET",
      endpoint: "/api/v1/decks",
      curl: `curl -X GET ${baseUrl}/api/v1/decks \\
  -H "Authorization: Bearer ${apiKey}"`,
      python: `import requests

response = requests.get(
    "${baseUrl}/api/v1/decks",
    headers={"Authorization": "Bearer ${apiKey}"}
)
decks = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/decks", {
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
});
const decks = await response.json();`
    },
    {
      title: "List Decks with Pagination",
      description: "Retrieve decks with limit and offset parameters",
      method: "GET",
      endpoint: "/api/v1/decks?limit=10&offset=0",
      curl: `curl -X GET "${baseUrl}/api/v1/decks?limit=10&offset=0" \\
  -H "Authorization: Bearer ${apiKey}"`,
      python: `import requests

response = requests.get(
    "${baseUrl}/api/v1/decks",
    params={"limit": 10, "offset": 0},
    headers={"Authorization": "Bearer ${apiKey}"}
)
decks = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/decks?limit=10&offset=0", {
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
});
const decks = await response.json();`
    },
    {
      title: "Create a New Deck",
      description: "Create a new deck with name and description",
      method: "POST",
      endpoint: "/api/v1/decks",
      curl: `curl -X POST ${baseUrl}/api/v1/decks \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Spanish Vocabulary",
    "description": "Common Spanish words and phrases",
    "isPublic": false
  }'`,
      python: `import requests

deck_data = {
    "name": "Spanish Vocabulary",
    "description": "Common Spanish words and phrases",
    "isPublic": False
}

response = requests.post(
    "${baseUrl}/api/v1/decks",
    json=deck_data,
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    }
)
deck = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/decks", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Spanish Vocabulary",
    description: "Common Spanish words and phrases",
    isPublic: false
  })
});
const deck = await response.json();`
    },
    {
      title: "Add Multiple Cards (Batch)",
      description: "Add multiple cards to a deck in a single request",
      method: "POST",
      endpoint: "/api/v1/decks/{deckId}/cards/batch",
      curl: `curl -X POST ${baseUrl}/api/v1/decks/{deckId}/cards/batch \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
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
  }'`,
      python: `import requests

cards_data = {
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
}

response = requests.post(
    "${baseUrl}/api/v1/decks/{deckId}/cards/batch",
    json=cards_data,
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    }
)
result = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/decks/{deckId}/cards/batch", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    cards: [
      {
        front: "Hello",
        back: "Hola",
        cardType: "BASIC",
        tags: ["greetings", "common"]
      },
      {
        front: "Goodbye",
        back: "Adiós",
        cardType: "BASIC",
        tags: ["greetings", "common"]
      }
    ]
  })
});
const result = await response.json();`
    },
    {
      title: "Add Cloze Cards",
      description: "Add cloze deletion cards with multiple cloze points",
      method: "POST",
      endpoint: "/api/v1/decks/{deckId}/cards/batch",
      curl: `curl -X POST ${baseUrl}/api/v1/decks/{deckId}/cards/batch \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cards": [
      {
        "front": "Spanish cloze example",
        "back": "The answer",
        "cardType": "CLOZE",
        "clozeText": "The capital of {{c1::Spain}} is {{c2::Madrid}}"
      }
    ]
  }'`,
      python: `import requests

cards_data = {
    "cards": [
        {
            "front": "Spanish cloze example",
            "back": "The answer",
            "cardType": "CLOZE",
            "clozeText": "The capital of {{c1::Spain}} is {{c2::Madrid}}"
        }
    ]
}

response = requests.post(
    "${baseUrl}/api/v1/decks/{deckId}/cards/batch",
    json=cards_data,
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    }
)
result = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/decks/{deckId}/cards/batch", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    cards: [
      {
        front: "Spanish cloze example",
        back: "The answer",
        cardType: "CLOZE",
        clozeText: "The capital of {{c1::Spain}} is {{c2::Madrid}}"
      }
    ]
  })
});
const result = await response.json();`
    },
    {
      title: "Get Review Queue",
      description: "Get all cards due for review",
      method: "GET",
      endpoint: "/api/v1/study/queue",
      curl: `curl -X GET ${baseUrl}/api/v1/study/queue \\
  -H "Authorization: Bearer ${apiKey}"`,
      python: `import requests

response = requests.get(
    "${baseUrl}/api/v1/study/queue",
    headers={"Authorization": "Bearer ${apiKey}"}
)
queue = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/study/queue", {
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
});
const queue = await response.json();`
    },
    {
      title: "Get Review Queue for Specific Deck",
      description: "Get cards due for review from a specific deck with limit",
      method: "GET",
      endpoint: "/api/v1/study/queue?deckId={deckId}&limit=20",
      curl: `curl -X GET "${baseUrl}/api/v1/study/queue?deckId={deckId}&limit=20" \\
  -H "Authorization: Bearer ${apiKey}"`,
      python: `import requests

response = requests.get(
    "${baseUrl}/api/v1/study/queue",
    params={"deckId": "{deckId}", "limit": 20},
    headers={"Authorization": "Bearer ${apiKey}"}
)
queue = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/study/queue?deckId={deckId}&limit=20", {
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
});
const queue = await response.json();`
    },
    {
      title: "Get Only New Cards",
      description: "Filter review queue to show only new cards",
      method: "GET",
      endpoint: "/api/v1/study/queue?includeNew=true&includeLearning=false&includeReview=false",
      curl: `curl -X GET "${baseUrl}/api/v1/study/queue?includeNew=true&includeLearning=false&includeReview=false" \\
  -H "Authorization: Bearer ${apiKey}"`,
      python: `import requests

response = requests.get(
    "${baseUrl}/api/v1/study/queue",
    params={
        "includeNew": "true",
        "includeLearning": "false",
        "includeReview": "false"
    },
    headers={"Authorization": "Bearer ${apiKey}"}
)
queue = response.json()`,
      javascript: `const response = await fetch("${baseUrl}/api/v1/study/queue?includeNew=true&includeLearning=false&includeReview=false", {
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
});
const queue = await response.json();`
    }
  ];

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "POST":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "PUT":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <CardTitle>API Examples</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {examples.length} examples
                </Badge>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
            <CardDescription>
              Interactive code examples for all API endpoints
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {!apiKey && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Generate an API key above to see personalized examples with your actual key.
                    The examples below use a placeholder key.
                  </AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-[700px] pr-4">
                <div className="space-y-6">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-semibold text-lg">{example.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {example.description}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${getMethodColor(example.method)} font-mono`}
                      >
                        {example.method}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {example.endpoint}
                      </code>
                    </div>

                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="curl" className="space-y-2">
                        <div className="relative group">
                          <div className="absolute top-2 left-2 text-xs text-muted-foreground font-mono">bash</div>
                          <pre className="bg-muted p-4 pt-8 rounded-lg overflow-x-auto text-sm">
                            <code className="language-bash">{example.curl}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(example.curl, `curl-${index}`)}
                          >
                            {copiedIndex === `curl-${index}` ? (
                              <span className="text-green-500">Copied!</span>
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                      
                      {example.python && (
                        <TabsContent value="python" className="space-y-2">
                          <div className="relative group">
                            <div className="absolute top-2 left-2 text-xs text-muted-foreground font-mono">python</div>
                            <pre className="bg-muted p-4 pt-8 rounded-lg overflow-x-auto text-sm">
                              <code className="language-python">{example.python}</code>
                            </pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyToClipboard(example.python!, `python-${index}`)}
                            >
                              {copiedIndex === `python-${index}` ? (
                                <span className="text-green-500">Copied!</span>
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                      
                      {example.javascript && (
                        <TabsContent value="javascript" className="space-y-2">
                          <div className="relative group">
                            <div className="absolute top-2 left-2 text-xs text-muted-foreground font-mono">javascript</div>
                            <pre className="bg-muted p-4 pt-8 rounded-lg overflow-x-auto text-sm">
                              <code className="language-javascript">{example.javascript}</code>
                            </pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyToClipboard(example.javascript!, `js-${index}`)}
                            >
                              {copiedIndex === `js-${index}` ? (
                                <span className="text-green-500">Copied!</span>
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                ))}
                
                {/* Error Handling Section */}
                <div className="border rounded-lg p-4 space-y-4 bg-destructive/5 border-destructive/20">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">Error Handling</h4>
                    <p className="text-sm text-muted-foreground">
                      All API errors follow a consistent format
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Error Response Format:</p>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{`{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional context
    }
  }
}`}</code>
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Common Error Codes:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">INVALID_API_KEY</Badge>
                          <span className="text-muted-foreground">API key is invalid or revoked</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">RATE_LIMIT_EXCEEDED</Badge>
                          <span className="text-muted-foreground">Too many requests</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">VALIDATION_ERROR</Badge>
                          <span className="text-muted-foreground">Request data validation failed</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">RESOURCE_NOT_FOUND</Badge>
                          <span className="text-muted-foreground">Resource doesn&apos;t exist</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Rate Limits Section */}
                <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">Rate Limits</h4>
                    <p className="text-sm text-muted-foreground">
                      API rate limits are included in response headers
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Response Headers:</p>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-01-08T12:00:00.000Z`}</code>
                      </pre>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">Default Endpoints</p>
                        <p className="text-muted-foreground">1000 requests/hour</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Batch Endpoints</p>
                        <p className="text-muted-foreground">100 requests/hour</p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}