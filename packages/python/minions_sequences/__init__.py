"""
Minions Sequences Python SDK

Multi-step email drip campaigns, cadence rules, A/B variants, and open/reply tracking
"""

__version__ = "0.1.0"


def create_client(**kwargs):
    """Create a client for Minions Sequences.

    Args:
        **kwargs: Configuration options.

    Returns:
        dict: Client configuration.
    """
    return {
        "version": __version__,
        **kwargs,
    }

from .schemas import *
