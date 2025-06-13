#!/usr/bin/env python3
"""
Claude Chat History Converter

This script converts Claude chat history from text format to JSON format
suitable for importing into the MCP Knowledge Graph.

Usage:
    python claude_history_converter.py --input <claude_history_file> --output <output_json_file>
"""

import argparse
import json
import logging
import re
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("claude-history-converter")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Convert Claude chat history to JSON format")
    parser.add_argument("--input", type=str, required=True, help="Path to Claude chat history text file")
    parser.add_argument("--output", type=str, required=True, help="Path to output JSON file")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    return parser.parse_args()


def parse_claude_history(file_path):
    """Parse Claude chat history from text file."""
    logger.info(f"Parsing Claude chat history from {file_path}")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        sys.exit(1)

    # Split the content into conversations
    # This is a simple approach - you may need to adjust based on your actual format
    conversation_pattern = re.compile(r"(Conversation: .*?)(?=Conversation: |$)", re.DOTALL)
    conversation_matches = list(conversation_pattern.finditer(content))

    if not conversation_matches:
        # If no "Conversation:" markers, treat the whole file as one conversation
        logger.info("No conversation markers found. Treating the entire file as one conversation.")
        conversation_matches = [re.match(r"(.*)", content)]

    conversations = []

    for i, match in enumerate(conversation_matches):
        conversation_text = match.group(1).strip()

        # Extract conversation ID or generate one
        id_match = re.search(r"Conversation: (.*?)(?:\n|$)", conversation_text)
        conversation_id = id_match.group(1).strip() if id_match else f"conversation_{i+1}"

        # Extract timestamp or use current time
        timestamp_match = re.search(r"Date: (.*?)(?:\n|$)", conversation_text)
        try:
            timestamp = (
                datetime.strptime(timestamp_match.group(1).strip(), "%Y-%m-%d %H:%M:%S").isoformat()
                if timestamp_match
                else datetime.now().isoformat()
            )
        except:
            timestamp = datetime.now().isoformat()

        # Extract messages
        # Remove conversation header
        message_text = re.sub(r"Conversation: .*?\n", "", conversation_text)
        message_text = re.sub(r"Date: .*?\n", "", message_text)

        # Parse messages
        message_pattern = re.compile(r"(Human|Assistant): (.*?)(?=Human:|Assistant:|$)", re.DOTALL)
        message_matches = list(message_pattern.finditer(message_text))

        messages = []
        for msg_match in message_matches:
            role, content = msg_match.groups()
            messages.append({"role": role.lower(), "content": content.strip()})

        if messages:
            conversations.append({"id": conversation_id, "timestamp": timestamp, "messages": messages})

    logger.info(
        f"Parsed {len(conversations)} conversations with a total of {sum(len(c['messages']) for c in conversations)} messages"
    )
    return conversations


def save_json(conversations, output_path):
    """Save conversations to JSON file."""
    logger.info(f"Saving {len(conversations)} conversations to {output_path}")

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(conversations, f, indent=2)
        logger.info(f"Successfully saved to {output_path}")
    except Exception as e:
        logger.error(f"Error saving JSON file: {e}")
        sys.exit(1)


def main():
    """Main function."""
    args = parse_arguments()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Parse Claude history
    conversations = parse_claude_history(args.input)

    # Save as JSON
    save_json(conversations, args.output)

    logger.info("Conversion completed successfully")
    logger.info(f"You can now import this file using: python import_claude_history.py --input {args.output}")


if __name__ == "__main__":
    main()
