import logging
from datetime import datetime
from typing import Any, Dict, List

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MemoryBufferManager:
    """Manages a buffer of conversation messages for memory recording"""

    def __init__(self):
        self.buffer: List[Dict[str, Any]] = []
        self.memory_on: bool = False
        self.start_time: datetime = None

    def add_message(self, role: str, content: str):
        """Add a message to the buffer if memory recording is on"""
        if not self.memory_on:
            logger.debug("Memory recording is off, message not added to buffer")
            return False

        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        }

        self.buffer.append(message)
        logger.debug(f"Added message to buffer. Buffer size: {len(self.buffer)}")
        return True

    def get_buffer(self) -> List[Dict[str, Any]]:
        """Get the current buffer contents"""
        return self.buffer

    def clear(self):
        """Clear the buffer"""
        buffer_size = len(self.buffer)
        self.buffer = []
        logger.info(f"Buffer cleared. Discarded {buffer_size} messages.")

    def start_recording(self):
        """Start recording messages to the buffer"""
        self.memory_on = True
        self.start_time = datetime.now()
        logger.info(f"Memory recording started at {self.start_time.isoformat()}")

    def stop_recording(self):
        """Stop recording messages to the buffer"""
        self.memory_on = False
        duration = datetime.now() - self.start_time if self.start_time else None
        logger.info(
            f"Memory recording stopped. Duration: {duration}. Buffer size: {len(self.buffer)}"
        )
        self.start_time = None

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the memory buffer"""
        return {
            "memory_on": self.memory_on,
            "buffer_size": len(self.buffer),
            "start_time": self.start_time.isoformat() if self.start_time else None,
        }
