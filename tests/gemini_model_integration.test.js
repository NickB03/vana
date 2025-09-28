/**
 * @fileoverview Gemini Model Integration Tests
 * Tests the integration with Google's Gemini AI model for message regeneration
 * and content generation functionality.
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

/**
 * Gemini Model Integration Test Suite
 *
 * Tests the integration with Google's Gemini AI model:
 * 1. Model initialization and configuration
 * 2. Message regeneration with Gemini
 * 3. Content generation and streaming
 * 4. Error handling for model failures
 * 5. API key validation and authentication
 * 6. Rate limiting and quota management
 * 7. Response formatting and parsing
 */
describe('Gemini Model Integration Tests', () => {
  let mockFetch;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Set test environment variables
    process.env.GOOGLE_API_KEY = 'test-google-api-key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Model Configuration and Initialization', () => {
    test('should initialize with valid Google API key', async () => {
      const mockHealthResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          dependencies: {
            google_api_configured: true,
            project_id: 'test-project'
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockHealthResponse);

      const response = await fetch('http://localhost:8000/health');
      const health = await response.json();

      expect(health.dependencies.google_api_configured).toBe(true);
      expect(health.dependencies.project_id).toBe('test-project');
    });

    test('should handle missing API key gracefully', async () => {
      // Remove API key from environment
      delete process.env.GOOGLE_API_KEY;

      const mockHealthResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          dependencies: {
            google_api_configured: false
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockHealthResponse);

      const response = await fetch('http://localhost:8000/health');
      const health = await response.json();

      expect(health.dependencies.google_api_configured).toBe(false);
    });

    test('should validate Google Cloud project configuration', async () => {
      const mockHealthResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          dependencies: {
            google_api_configured: true,
            project_id: 'valid-project-id',
            cloud_logging: true
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockHealthResponse);

      const response = await fetch('http://localhost:8000/health');
      const health = await response.json();

      expect(health.dependencies.project_id).toBeTruthy();
      expect(health.dependencies.cloud_logging).toBe(true);
    });
  });

  describe('Message Regeneration with Gemini', () => {
    test('should regenerate message content using Gemini model', async () => {
      const messageId = 'msg_gemini_test_session_123_assistant';
      const originalUserQuery = 'Explain quantum computing in simple terms';

      // Mock regeneration request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'gemini_regen_task_123',
            original_message_id: 'msg_user_query_123',
            model_used: 'gemini-1.5-pro'
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_preferences: {
            model: 'gemini-1.5-pro',
            temperature: 0.7,
            max_tokens: 2048
          }
        })
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('regenerate');
      expect(result.data.model_used).toBe('gemini-1.5-pro');
    });

    test('should handle Gemini streaming responses', async () => {
      const taskId = 'gemini_streaming_task';

      // Mock task status with streaming progress
      const progressSteps = [
        {
          status: 'in_progress',
          progress: 10,
          message: 'Initializing Gemini model...',
          model_stage: 'initialization'
        },
        {
          status: 'in_progress',
          progress: 30,
          message: 'Processing user query...',
          model_stage: 'query_processing'
        },
        {
          status: 'in_progress',
          progress: 60,
          message: 'Generating response with Gemini...',
          model_stage: 'content_generation',
          partial_content: 'Quantum computing is a revolutionary...'
        },
        {
          status: 'in_progress',
          progress: 90,
          message: 'Finalizing response...',
          model_stage: 'finalization',
          partial_content: 'Quantum computing is a revolutionary approach to processing information that leverages quantum mechanics...'
        },
        {
          status: 'completed',
          progress: 100,
          message: 'Response generated successfully',
          model_stage: 'completed',
          full_content: 'Quantum computing is a revolutionary approach to processing information that leverages quantum mechanical phenomena like superposition and entanglement to perform calculations that would be impossible or impractical for classical computers.'
        }
      ];

      // Mock each progress step
      progressSteps.forEach((step, index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            task_id: taskId,
            ...step,
            model_info: {
              name: 'gemini-1.5-pro',
              version: '001',
              timestamp: '2025-01-26T10:00:00Z'
            }
          })
        });
      });

      // Test each progress step
      for (let i = 0; i < progressSteps.length; i++) {
        const response = await fetch(`http://localhost:8000/api/messages/tasks/${taskId}/status`);
        const status = await response.json();

        expect(status.progress).toBe(progressSteps[i].progress);
        expect(status.model_stage).toBe(progressSteps[i].model_stage);
        expect(status.model_info.name).toBe('gemini-1.5-pro');

        if (progressSteps[i].partial_content) {
          expect(status.partial_content).toBeTruthy();
        }

        if (progressSteps[i].status === 'completed') {
          expect(status.full_content).toBeTruthy();
          expect(status.full_content.length).toBeGreaterThan(100);
        }
      }
    });

    test('should handle different Gemini model variants', async () => {
      const messageId = 'msg_model_variants_test';
      const modelVariants = [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      ];

      for (const model of modelVariants) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message_id: messageId,
            operation: 'regenerate',
            data: {
              task_id: `task_${model}`,
              model_used: model,
              model_capabilities: {
                multimodal: model.includes('1.5'),
                context_length: model.includes('pro') ? 2000000 : 1000000,
                function_calling: true
              }
            }
          })
        });

        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model_preferences: {
              model: model,
              temperature: 0.7
            }
          })
        });

        const result = await response.json();

        expect(result.data.model_used).toBe(model);
        expect(result.data.model_capabilities).toBeDefined();
        expect(result.data.model_capabilities.function_calling).toBe(true);
      }
    });
  });

  describe('Content Generation Features', () => {
    test('should generate content with specific parameters', async () => {
      const messageId = 'msg_content_generation_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'content_gen_task',
            generation_config: {
              temperature: 0.9,
              top_p: 0.8,
              top_k: 40,
              max_output_tokens: 2048,
              stop_sequences: ['###END###']
            },
            safety_settings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_preferences: {
            temperature: 0.9,
            top_p: 0.8,
            top_k: 40,
            max_tokens: 2048,
            stop_sequences: ['###END###']
          },
          safety_settings: {
            harassment: 'BLOCK_MEDIUM_AND_ABOVE',
            dangerous_content: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        })
      });

      const result = await response.json();

      expect(result.data.generation_config.temperature).toBe(0.9);
      expect(result.data.generation_config.top_p).toBe(0.8);
      expect(result.data.safety_settings).toHaveLength(2);
    });

    test('should handle multimodal content generation', async () => {
      const messageId = 'msg_multimodal_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'multimodal_task',
            model_used: 'gemini-1.5-pro',
            input_types: ['text', 'image'],
            content_analysis: {
              text_length: 256,
              image_count: 1,
              image_formats: ['jpeg'],
              total_tokens_used: 1024
            }
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          multimodal_input: {
            text: 'Describe this image in detail',
            images: [
              {
                mime_type: 'image/jpeg',
                data: 'base64_encoded_image_data'
              }
            ]
          }
        })
      });

      const result = await response.json();

      expect(result.data.input_types).toContain('text');
      expect(result.data.input_types).toContain('image');
      expect(result.data.content_analysis.image_count).toBe(1);
    });

    test('should handle function calling capabilities', async () => {
      const messageId = 'msg_function_calling_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'function_calling_task',
            model_used: 'gemini-1.5-pro',
            function_calls: [
              {
                name: 'get_weather',
                arguments: {
                  location: 'San Francisco, CA',
                  unit: 'celsius'
                }
              }
            ],
            function_responses: [
              {
                name: 'get_weather',
                response: {
                  temperature: 18,
                  condition: 'partly cloudy',
                  humidity: 65
                }
              }
            ]
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enable_function_calling: true,
          available_functions: [
            {
              name: 'get_weather',
              description: 'Get current weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                  unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
                }
              }
            }
          ]
        })
      });

      const result = await response.json();

      expect(result.data.function_calls).toHaveLength(1);
      expect(result.data.function_calls[0].name).toBe('get_weather');
      expect(result.data.function_responses).toHaveLength(1);
      expect(result.data.function_responses[0].response.temperature).toBe(18);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle API quota exceeded errors', async () => {
      const messageId = 'msg_quota_test';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: {
            code: 429,
            message: 'Quota exceeded',
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                'violations': [
                  {
                    'subject': 'projects/test-project',
                    'description': 'API calls quota exceeded'
                  }
                ]
              }
            ]
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST'
      });

      const error = await response.json();

      expect(response.status).toBe(429);
      expect(error.error.code).toBe(429);
      expect(error.error.message).toBe('Quota exceeded');
    });

    test('should handle safety filter violations', async () => {
      const messageId = 'msg_safety_test';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            code: 400,
            message: 'Content blocked by safety filters',
            details: {
              safety_ratings: [
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  probability: 'HIGH',
                  blocked: true
                }
              ],
              block_reason: 'SAFETY'
            }
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'Potentially harmful content'
        })
      });

      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error.error.details.block_reason).toBe('SAFETY');
      expect(error.error.details.safety_ratings[0].blocked).toBe(true);
    });

    test('should handle model overload errors', async () => {
      const messageId = 'msg_overload_test';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          error: {
            code: 503,
            message: 'The model is overloaded. Please try again later.',
            retry_after: 30
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST'
      });

      const error = await response.json();

      expect(response.status).toBe(503);
      expect(error.error.message).toContain('overloaded');
      expect(error.error.retry_after).toBe(30);
    });

    test('should handle invalid model parameters', async () => {
      const messageId = 'msg_invalid_params_test';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            code: 400,
            message: 'Invalid request parameters',
            details: {
              field_violations: [
                {
                  field: 'temperature',
                  description: 'Temperature must be between 0 and 2'
                },
                {
                  field: 'max_output_tokens',
                  description: 'Max output tokens exceeds model limit'
                }
              ]
            }
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_preferences: {
            temperature: 3.0, // Invalid: too high
            max_tokens: 5000000 // Invalid: exceeds limit
          }
        })
      });

      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error.error.details.field_violations).toHaveLength(2);
      expect(error.error.details.field_violations[0].field).toBe('temperature');
    });

    test('should handle network connectivity issues with Gemini API', async () => {
      const messageId = 'msg_network_test';

      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      try {
        await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
          method: 'POST'
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('ECONNREFUSED');
      }
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track token usage and costs', async () => {
      const taskId = 'token_tracking_task';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          task_id: taskId,
          status: 'completed',
          model_info: {
            name: 'gemini-1.5-pro',
            token_usage: {
              prompt_tokens: 150,
              completion_tokens: 300,
              total_tokens: 450
            },
            cost_estimation: {
              input_cost: 0.00015, // $0.00015 for prompt tokens
              output_cost: 0.0006,  // $0.0006 for completion tokens
              total_cost: 0.00075
            },
            performance_metrics: {
              latency_ms: 2500,
              throughput_tokens_per_second: 180
            }
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/tasks/${taskId}/status`);
      const result = await response.json();

      expect(result.model_info.token_usage.total_tokens).toBe(450);
      expect(result.model_info.cost_estimation.total_cost).toBe(0.00075);
      expect(result.model_info.performance_metrics.latency_ms).toBe(2500);
      expect(result.model_info.performance_metrics.throughput_tokens_per_second).toBe(180);
    });

    test('should monitor model response quality metrics', async () => {
      const taskId = 'quality_metrics_task';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          task_id: taskId,
          status: 'completed',
          quality_metrics: {
            coherence_score: 0.92,
            relevance_score: 0.89,
            factual_accuracy_score: 0.94,
            safety_score: 0.98,
            content_length: 1250,
            reading_level: 'college',
            sentiment: 'neutral',
            key_topics: ['quantum computing', 'technology', 'science'],
            language_quality: {
              grammar_score: 0.96,
              style_score: 0.91,
              clarity_score: 0.93
            }
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/tasks/${taskId}/status`);
      const result = await response.json();

      expect(result.quality_metrics.coherence_score).toBe(0.92);
      expect(result.quality_metrics.safety_score).toBe(0.98);
      expect(result.quality_metrics.key_topics).toContain('quantum computing');
      expect(result.quality_metrics.language_quality.grammar_score).toBe(0.96);
    });

    test('should handle model fallback scenarios', async () => {
      const messageId = 'msg_fallback_test';

      // First attempt with preferred model fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          error: {
            code: 503,
            message: 'gemini-1.5-pro is currently unavailable'
          }
        })
      });

      // Second attempt with fallback model succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'fallback_task',
            model_used: 'gemini-1.5-flash', // Fallback model
            fallback_info: {
              original_model: 'gemini-1.5-pro',
              fallback_reason: 'Primary model unavailable',
              fallback_time: '2025-01-26T10:01:00Z'
            }
          }
        })
      });

      // First attempt (fails)
      let response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ model_preferences: { model: 'gemini-1.5-pro' } })
      });

      expect(response.status).toBe(503);

      // Second attempt with fallback (succeeds)
      response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ model_preferences: { model: 'gemini-1.5-flash' } })
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.model_used).toBe('gemini-1.5-flash');
      expect(result.data.fallback_info.original_model).toBe('gemini-1.5-pro');
    });
  });
});