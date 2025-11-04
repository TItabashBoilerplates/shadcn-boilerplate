"""Custom exception classes for the application."""


class AuthenticationError(Exception):
    """Raised when authentication fails."""


class ResourceNotFoundError(Exception):
    """Raised when a requested resource is not found."""


class ConfigurationError(Exception):
    """Raised when configuration is invalid or missing."""
