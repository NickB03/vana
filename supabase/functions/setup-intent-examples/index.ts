import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXAMPLES = {
  // REACT - 34 examples (most common - web apps, dashboards, tools)
  react: [
    "build a cryptocurrency dashboard with live prices",
    "create a chat interface like ChatGPT",
    "make a kanban board like Trello",
    "build a recipe finder app",
    "create an invoice generator",
    "build a time tracking dashboard",
    "make an expense tracker with charts",
    "create a CRM tool",
    "build a SaaS landing page",
    "create a portfolio website",
    "make a restaurant website with menu",
    "build a markdown editor with preview",
    "create a JSON formatter",
    "make a color palette generator",
    "build a loan calculator",
    "create a tic-tac-toe game",
    "make a typing speed test",
    "build a quiz app",
    "create a multi-step form wizard",
    "build a product catalog with cart",
    "make a Twitter clone",
    "create a QR code generator",
    "build a weather app",
    "make a todo list app",
    "create a data visualization dashboard",
    "build a kanban project manager",
    "make a music player",
    "create a notes app",
    "build a calendar scheduler",
    "make an image gallery",
    "build an API for user management",
    "create a REST API dashboard",
    "make an admin panel for my API",
    "build a GraphQL playground"
  ],

  // IMAGE - 25 examples (default for all visuals - logos, icons, photos)
  image: [
    "generate a sunset over mountains",
    "create a photorealistic portrait",
    "show me product photography of a watch",
    "generate a movie poster",
    "create a logo for my coffee shop",
    "generate a brand mood board",
    "show me luxury packaging design",
    "create pixel art of a castle",
    "generate watercolor painting",
    "show me cyberpunk city scene",
    "create a dragon illustration",
    "generate a realistic cat photo",
    "show me futuristic car design",
    "create fantasy book cover",
    "generate desktop wallpaper",
    "create YouTube thumbnail",
    "show me presentation background",
    "generate website hero image",
    "design an icon for mobile app",
    "make a badge for achievements",
    "create a company emblem",
    "diagram of a dog",
    "show me what a quantum computer looks like",
    "generate album cover art",
    "create Instagram post design"
  ],

  // CODE - 20 examples (programming snippets with language specified)
  code: [
    "write a Python function to merge sort",
    "create a JavaScript debounce function",
    "write a Rust JSON parser",
    "make a TypeScript deep clone utility",
    "implement binary search in Python",
    "create a breadth-first search algorithm",
    "write Dijkstra's shortest path",
    "show me an Express API endpoint",
    "write a FastAPI file upload route",
    "create a GraphQL resolver",
    "write a SQL query for duplicates",
    "create a Postgres recursive CTE",
    "write a MongoDB aggregation",
    "write a bash backup script",
    "create a Python web scraper",
    "write a Node.js image resizer",
    "create a regex for email validation",
    "write a regex to parse markdown",
    "implement a LinkedList in TypeScript",
    "create a binary tree class"
  ],

  // MERMAID - 15 examples (process/logic diagrams only)
  mermaid: [
    "create a flowchart for user login",
    "make a flowchart for loan approval",
    "draw order fulfillment process",
    "create password reset flowchart",
    "make a sequence diagram of API auth",
    "create microservices sequence diagram",
    "draw payment processing sequence",
    "create ER diagram for ecommerce",
    "make database schema diagram",
    "draw blog platform ER diagram",
    "create state diagram for orders",
    "make traffic light state machine",
    "create gantt chart for project",
    "make project timeline",
    "draw system architecture diagram"
  ],

  // MARKDOWN - 15 examples (long-form writing)
  markdown: [
    "write API documentation",
    "create a README file",
    "write technical documentation",
    "make a getting started guide",
    "write a React hooks tutorial",
    "create async/await guide",
    "write article on blockchain",
    "write blog post on remote work",
    "create product launch case study",
    "write AI healthcare white paper",
    "write market analysis report",
    "create climate change summary",
    "write essay on future of work",
    "write deployment guide",
    "create troubleshooting guide"
  ],

  // CHAT - 15 examples (questions/conversations)
  chat: [
    "what is React?",
    "explain SQL vs NoSQL",
    "how do I center a div?",
    "what are TypeScript benefits?",
    "tell me about quantum computing",
    "explain machine learning",
    "what is JAMstack?",
    "best way to learn Python?",
    "which database should I use?",
    "what tools for web development?",
    "hello, what can you do?",
    "tell me a programming joke",
    "compare React and Vue",
    "difference between var and let?",
    "should I use REST or GraphQL?"
  ],

  // SVG - 8 examples (RARE - only explicit vector requests)
  svg: [
    "create a scalable vector logo in SVG",
    "design a geometric icon that scales infinitely",
    "make a minimalist line art logo",
    "create a vector I can edit in Illustrator",
    "design a monochrome print logo",
    "generate a geometric pattern grid",
    "create a mathematical path visualization",
    "make a single-color monogram"
  ]
};

Deno.serve(async (req) => {
  console.log('🚀 Starting intent examples setup with Supabase native embeddings...\n');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const stats = {
    total: 0,
    byIntent: {} as Record<string, number>
  };

  try {
    // Create embedding session using Supabase's native AI inference
    const session = new Supabase.ai.Session('gte-small');

    for (const [intent, texts] of Object.entries(EXAMPLES)) {
      console.log(`📝 Processing ${intent} (${texts.length} examples)...`);
      stats.byIntent[intent] = 0;

      // Process in batches of 25 to avoid compute limits
      const BATCH_SIZE = 25;
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, Math.min(i + BATCH_SIZE, texts.length));
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(texts.length / BATCH_SIZE);
        console.log(`  📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.length} examples...`);

        for (const text of batch) {
          // Generate embedding using Supabase native AI (FREE, no external API!)
          const embedding = await session.run(text, {
            mean_pool: true,
            normalize: true,
          });

          // Store in Supabase pgvector
          const { error } = await supabase.from('intent_examples').insert({
            intent,
            text,
            embedding: Array.from(embedding) // Convert to array for pgvector
          });

          if (error) {
            console.error(`❌ Error inserting: ${error.message}`);
          } else {
            stats.total++;
            stats.byIntent[intent]++;
            console.log(`    ✓ "${text.substring(0, 50)}..."`);
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log('');
    }

    console.log('✅ Setup Complete!\n');
    console.log(`   Total examples: ${stats.total}`);
    console.log(`   Cost: $0 (Supabase native embeddings)`);
    console.log(`   By intent:`, stats.byIntent);
    console.log('\n🎯 Intent detection system is ready to use!');

    return new Response(JSON.stringify({
      success: true,
      stats
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
