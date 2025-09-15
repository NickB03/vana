"use client"

import React, { useState } from "react"
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/ui/prompt-input"
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Sparkles, Search, Code, Lightbulb } from "lucide-react"

// Sample suggestion data
const basicSuggestions = [
  "Tell me a joke",
  "Explain quantum computing",
  "Write a Python function",
  "Plan a weekend trip",
  "Create a business plan",
  "Debug my code",
]

const categorizedSuggestions = {
  coding: [
    "How to create a React component",
    "Debug JavaScript errors",
    "Optimize database queries",
    "Set up CI/CD pipeline",
    "Write unit tests",
  ],
  research: [
    "Research market trends",
    "Analyze competitor strategies",
    "Find latest industry news",
    "Compare technology solutions",
    "Gather user feedback",
  ],
  creative: [
    "Write a story about robots",
    "Design a logo concept",
    "Create marketing copy",
    "Brainstorm product names",
    "Draft email templates",
  ],
}

export function PromptSuggestionDemo() {
  const [inputValue, setInputValue] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("coding")
  const [isLoading, setIsLoading] = useState(false)

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    setInputValue("")
    
    console.log("Submitted:", inputValue)
  }

  const filteredSuggestions = basicSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Prompt-Kit Suggestion Component Demo</h1>
        <p className="text-muted-foreground">
          Interactive examples of the PromptSuggestion component with PromptInput integration
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Mode</TabsTrigger>
          <TabsTrigger value="highlight">Highlight Mode</TabsTrigger>
          <TabsTrigger value="categorized">Categorized</TabsTrigger>
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
        </TabsList>

        {/* Basic Mode Demo */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Basic Suggestion Mode
              </CardTitle>
              <CardDescription>
                Clickable pill-shaped buttons ideal for quick prompt suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PromptInput
                value={inputValue}
                onValueChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              >
                <PromptInputTextarea 
                  placeholder="Type your message or click a suggestion below..." 
                />
                <PromptInputActions>
                  <PromptInputAction tooltip="Send message">
                    <Button size="sm" disabled={!inputValue.trim() || isLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>

              <div className="space-y-3">
                <p className="text-sm font-medium">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {basicSuggestions.map((suggestion, index) => (
                    <PromptSuggestion
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      variant="outline"
                      size="sm"
                    >
                      {suggestion}
                    </PromptSuggestion>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Highlight Mode Demo */}
        <TabsContent value="highlight" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Highlight Mode with Search
              </CardTitle>
              <CardDescription>
                Search and highlight matching terms in suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium">
                  Search suggestions:
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter and highlight..."
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Filtered suggestions ({filteredSuggestions.length}):
                </p>
                <div className="grid gap-2">
                  {filteredSuggestions.map((suggestion, index) => (
                    <PromptSuggestion
                      key={index}
                      highlight={searchTerm}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left"
                    >
                      {suggestion}
                    </PromptSuggestion>
                  ))}
                </div>
              </div>

              {filteredSuggestions.length === 0 && searchTerm && (
                <div className="text-center py-8 text-muted-foreground">
                  No suggestions found matching "{searchTerm}"
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorized Demo */}
        <TabsContent value="categorized" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Categorized Suggestions
              </CardTitle>
              <CardDescription>
                Organized suggestions by category with different styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {Object.keys(categorizedSuggestions).map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-2">
                {categorizedSuggestions[selectedCategory as keyof typeof categorizedSuggestions].map((suggestion, index) => (
                  <PromptSuggestion
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    variant="ghost"
                    className="justify-start"
                  >
                    <div className="flex items-center gap-2">
                      {selectedCategory === "coding" && <Code className="h-4 w-4" />}
                      {selectedCategory === "research" && <Search className="h-4 w-4" />}
                      {selectedCategory === "creative" && <Lightbulb className="h-4 w-4" />}
                      {suggestion}
                    </div>
                  </PromptSuggestion>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactive Demo */}
        <TabsContent value="interactive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Interactive Chat Interface
              </CardTitle>
              <CardDescription>
                Complete integration example with loading states and dynamic suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PromptInput
                value={inputValue}
                onValueChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                className="mb-4"
              >
                <PromptInputTextarea 
                  placeholder={isLoading ? "Processing your request..." : "Ask me anything..."} 
                />
                <PromptInputActions>
                  <PromptInputAction tooltip="Send message">
                    <Button 
                      size="sm" 
                      disabled={!inputValue.trim() || isLoading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isLoading ? (
                        <Sparkles className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>

              {!isLoading && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Try these suggestions:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {basicSuggestions.slice(0, 4).map((suggestion, index) => (
                      <PromptSuggestion
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        variant="outline"
                        className="justify-start p-3 h-auto"
                      >
                        <div className="text-left">
                          <div className="font-medium">{suggestion}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Click to use this prompt
                          </div>
                        </div>
                      </PromptSuggestion>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Processing your request...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <CardDescription>Code snippets for implementing the components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Basic Suggestion:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`<PromptSuggestion onClick={() => setInput("Tell me a joke")}>
  Tell me a joke
</PromptSuggestion>`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Highlight Mode:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`<PromptSuggestion 
  highlight="how to"
  onClick={() => setInput("How to create a React component")}
>
  How to create a React component
</PromptSuggestion>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Integration with PromptInput:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`<PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
  <PromptInputTextarea placeholder="Type your message..." />
  <PromptInputActions>
    <PromptInputAction tooltip="Send">
      <Button><Send /></Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PromptSuggestionDemo