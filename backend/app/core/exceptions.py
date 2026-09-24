from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class QFlowException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ResourceNotFound(QFlowException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(QFlowException):
    def __init__(self, message: str = "Authentication token is missing, invalid, or expired."):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(QFlowException):
    def __init__(self, required_permission: str):
        super().__init__(
            code="FORBIDDEN",
            message=f"Access denied. Required permission: '{required_permission}'.",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ValidationError(QFlowException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class OptimizationFailed(QFlowException):
    def __init__(self, reason: str):
        super().__init__(
            code="OPTIMIZATION_FAILED",
            message=f"QPSO optimization run failed: {reason}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
