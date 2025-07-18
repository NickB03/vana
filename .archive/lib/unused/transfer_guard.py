"""
Transfer Guard - Prevents circular agent transfers
"""

import logging
from typing import Set, Optional
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# Track transfer chain per request
transfer_chain: ContextVar[Set[str]] = ContextVar('transfer_chain', default=set())

class TransferGuard:
    """Prevents circular transfers between agents"""
    
    @staticmethod
    def check_transfer(from_agent: str, to_agent: str) -> bool:
        """
        Check if a transfer is allowed (not circular).
        
        Args:
            from_agent: Name of agent initiating transfer
            to_agent: Name of target agent
            
        Returns:
            True if transfer is allowed, False if it would create a loop
        """
        chain = transfer_chain.get()
        
        # Check for direct loops
        if to_agent in chain:
            logger.warning(f"❌ Circular transfer detected: {from_agent} → {to_agent} (already in chain: {chain})")
            return False
            
        # Special rules
        if from_agent == "enhanced_orchestrator" and to_agent == "vana":
            logger.warning("❌ Orchestrator cannot transfer back to VANA")
            return False
            
        return True
    
    @staticmethod
    def record_transfer(agent_name: str):
        """Record that we've transferred to this agent"""
        chain = transfer_chain.get()
        new_chain = chain.copy()
        new_chain.add(agent_name)
        transfer_chain.set(new_chain)
        logger.info(f"Transfer chain: {new_chain}")
    
    @staticmethod
    def reset_chain():
        """Reset the transfer chain for a new request"""
        transfer_chain.set(set())
        logger.debug("Transfer chain reset")