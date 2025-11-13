
import json
import requests
import time

# This data is copied directly from supabase/functions/setup-intent-examples/index.ts
EXAMPLES = {
  "react": [
    "build a cryptocurrency dashboard with live prices", "create a chat interface like ChatGPT",
    "make a kanban board like Trello", "build a recipe finder app", "create an invoice generator",
    "build a time tracking dashboard", "make an expense tracker with charts", "create a CRM tool",
    "build a SaaS landing page", "create a portfolio website", "make a restaurant website with menu",
    "build a markdown editor with preview", "create a JSON formatter", "make a color palette generator",
    "build a loan calculator", "create a tic-tac-toe game", "make a typing speed test",
    "build a quiz app", "create a multi-step form wizard", "build a product catalog with cart",
    "make a Twitter clone", "create a QR code generator", "build a weather app", "make a todo list app",
    "create a data visualization dashboard", "build a kanban project manager", "make a music player",
    "create a notes app", "build a calendar scheduler", "make an image gallery",
    "build an API for user management", "create a REST API dashboard", "make an admin panel for my API",
    "build a GraphQL playground"
  ],
  "image": [
    "generate a sunset over mountains", "create a photorealistic portrait",
    "show me product photography of a watch", "generate a movie poster", "create a logo for my coffee shop",
    "generate a brand mood board", "show me luxury packaging design", "create pixel art of a castle",
    "generate watercolor painting", "show me cyberpunk city scene", "create a dragon illustration",
    "generate a realistic cat photo", "show me futuristic car design", "create fantasy book cover",
    "generate desktop wallpaper", "create YouTube thumbnail", "show me presentation background",
    "generate website hero image", "design an icon for mobile app", "make a badge for achievements",
    "create a company emblem", "diagram of a dog", "show me what a quantum computer looks like",
    "generate album cover art", "create Instagram post design"
  ],
  "code": [
    "write a Python function to merge sort", "create a JavaScript debounce function",
    "write a Rust JSON parser", "make a TypeScript deep clone utility", "implement binary search in Python",
    "create a breadth-first search algorithm", "write Dijkstra's shortest path",
    "show me an Express API endpoint", "write a FastAPI file upload route", "create a GraphQL resolver",
    "write a SQL query for duplicates", "create a Postgres recursive CTE", "write a MongoDB aggregation",
    "write a bash backup script", "create a Python web scraper", "write a Node.js image resizer",
    "create a regex for email validation", "write a regex to parse markdown",
    "implement a LinkedList in TypeScript", "create a binary tree class"
  ],
  "mermaid": [
    "create a flowchart for user login", "make a flowchart for loan approval", "draw order fulfillment process",
    "create password reset flowchart", "make a sequence diagram of API auth",
    "create microservices sequence diagram", "draw payment processing sequence", "create ER diagram for ecommerce",
    "make database schema diagram", "draw blog platform ER diagram", "create state diagram for orders",
    "make traffic light state machine", "create gantt chart for project", "make project timeline",
    "draw system architecture diagram"
  ],
  "markdown": [
    "write API documentation", "create a README file", "write technical documentation",
    "make a getting started guide", "write a React hooks tutorial", "create async/await guide",
    "write article on blockchain", "write blog post on remote work", "create product launch case study",
    "write AI healthcare white paper", "write market analysis report", "create climate change summary",
    "write essay on future of work", "write deployment guide", "create troubleshooting guide"
  ],
  "chat": [
    "what is React?", "explain SQL vs NoSQL", "how do I center a div?", "what are TypeScript benefits?",
    "tell me about quantum computing", "explain machine learning", "what is JAMstack?",
    "best way to learn Python?", "which database should I use?", "what tools for web development?",
    "hello, what can you do?", "tell me a programming joke", "compare React and Vue",
    "difference between var and let?", "should I use REST or GraphQL?"
  ],
  "svg": [
    "create a scalable vector logo in SVG", "design a geometric icon that scales infinitely",
    "make a minimalist line art logo", "create a vector I can edit in Illustrator",
    "design a monochrome print logo", "generate a geometric pattern grid",
    "create a mathematical path visualization", "make a single-color monogram"
  ]
}

# Configure your LM Studio server details here
LMSTUDIO_API_URL = "http://localhost:1234/v1/embeddings"
# Using mixedbread-ai/mxbai-embed-large-v1 (1024 dimensions)
# This model is SOTA for embeddings and optimized for retrieval tasks
MODEL_NAME = "mixedbread-ai/mxbai-embed-large-v1"
OUTPUT_FILE = "intent_embeddings.json"

# Important: For retrieval, queries should use this prompt, but documents should NOT
# We're generating document embeddings here, so we don't use the prompt
# The prompt will be used at runtime when embedding user queries

def create_embedding(text):
    """Sends text to the LM Studio embedding endpoint and returns the embedding."""
    headers = {"Content-Type": "application/json"}
    data = {
        "input": text,
        "model": MODEL_NAME
    }
    try:
        response = requests.post(LMSTUDIO_API_URL, headers=headers, json=data)
        response.raise_for_status()  # Raise an exception for bad status codes
        embedding = response.json()["data"][0]["embedding"]
        return embedding
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to LM Studio: {e}")
        print("Please ensure LM Studio is running and the server is enabled.")
        return None

def main():
    """Iterates through examples, generates embeddings, and saves them to a file."""
    all_embeddings = {}
    total_examples = sum(len(texts) for texts in EXAMPLES.values())
    processed_count = 0

    print(f"Starting embedding generation for {total_examples} examples...")
    print(f"Model: {MODEL_NAME}")
    print("-" * 30)

    for intent, texts in EXAMPLES.items():
        all_embeddings[intent] = []
        print(f"Processing intent: '{intent}' ({len(texts)} examples)")
        for i, text in enumerate(texts):
            processed_count += 1
            print(f"  ({processed_count}/{total_examples}) Generating embedding for: \"{text[:50]}...\" ")
            
            embedding = create_embedding(text)
            
            if embedding:
                all_embeddings[intent].append({
                    "text": text,
                    "embedding": embedding
                })
            else:
                print(f"    Failed to create embedding. Skipping.")
                # Optional: add a retry mechanism here
            
            # Small delay to avoid overwhelming the server
            time.sleep(0.1)
        print("-" * 30)

    print(f"✅ All embeddings generated. Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_embeddings, f, indent=2)
    
    print("Done!")

if __name__ == "__main__":
    main()
