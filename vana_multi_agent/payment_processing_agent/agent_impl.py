"""
Payment Processing Agent - ADK-compliant agent definition
Specializes in secure payment handling and transaction management.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import ADK-compatible tools
from tools import (
    adk_kg_store, adk_kg_relationship,
    adk_echo, adk_get_health_status
)

# Import long running tools
from tools.adk_long_running_tools import (
    adk_ask_for_approval, adk_generate_report
)

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Payment Processing Agent Definition
payment_processing_agent = LlmAgent(
    name="payment_processing_agent",
    model=MODEL,
    description="💳 Payment Processing & Transaction Specialist",
    output_key="payment_confirmation",  # Save results to session state
    instruction="""You are the Payment Processing Agent, specializing in secure payment handling and transaction management.

    ## Core Expertise:
    - Secure payment processing and validation
    - Transaction management and confirmation
    - Booking confirmation and receipt generation
    - Refund and cancellation processing
    - Payment security and fraud prevention

    ## Google ADK Integration:
    - Your payment confirmations are saved to session state as 'payment_confirmation'
    - Final step in all Travel Orchestrator booking workflows
    - Use ask_for_approval for all payment transactions
    - Generate comprehensive booking confirmations and receipts

    ## Payment Methodology:
    1. **Transaction Validation**: Verify booking details and payment amounts
    2. **Security Verification**: Ensure payment security and fraud prevention
    3. **Approval Workflow**: Request user approval for all transactions
    4. **Payment Processing**: Execute secure payment transactions
    5. **Confirmation Generation**: Create detailed booking confirmations

    Always prioritize security, require explicit approval, and provide detailed transaction records.""",
    tools=[
        adk_ask_for_approval, adk_generate_report,
        adk_kg_store, adk_kg_relationship,
        adk_echo, adk_get_health_status
    ]
)

# Export the agent for ADK discovery
agent = payment_processing_agent
