import json
import logging
from typing import Optional, List
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from jose import jwt, JWTError

from app.core.config import settings
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.core.permissions import AppRole, Permission, has_permission

logger = logging.getLogger("qflow.security")


class CurrentUser(BaseModel):
    user_id: str
    email: str
    organization_id: str
    role: AppRole
    permissions: List[str]

    def can(self, permission: Permission) -> bool:
        return permission.value in self.permissions


UserContext = CurrentUser



# Demo User Profiles Fallback when running local offline dev or testing without live JWT
DEMO_USER_PROFILES = {
    "admin@qswarm.io": {
        "user_id": "usr_admin_01",
        "email": "admin@qswarm.io",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "role": AppRole.ORG_ADMIN,
    },
    "ops@qswarm.io": {
        "user_id": "usr_ops_04",
        "email": "ops@qswarm.io",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "role": AppRole.OPERATIONS_MANAGER,
    },
    "dispatcher@qswarm.io": {
        "user_id": "usr_disp_02",
        "email": "dispatcher@qswarm.io",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "role": AppRole.DISPATCHER,
    },
    "analyst@qswarm.io": {
        "user_id": "usr_an_03",
        "email": "analyst@qswarm.io",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "role": AppRole.ANALYST,
    },
}


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_demo_user: Optional[str] = Header(None, alias="X-Demo-User"),
) -> CurrentUser:
    """
    FastAPI dependency to extract and verify Supabase Auth Bearer token or Demo User header.
    Returns authenticated CurrentUser context with user_id, organization_id, role & permissions.
    """
    # 1. Check for X-Demo-User header for development/testing
    if x_demo_user and x_demo_user in DEMO_USER_PROFILES:
        demo_data = DEMO_USER_PROFILES[x_demo_user]
        user_role = demo_data["role"]
        from app.core.permissions import ROLE_PERMISSIONS
        perms = [p.value for p in ROLE_PERMISSIONS.get(user_role, set())]
        return CurrentUser(
            user_id=demo_data["user_id"],
            email=demo_data["email"],
            organization_id=demo_data["organization_id"],
            role=user_role,
            permissions=perms,
        )

    # 2. Extract Authorization Bearer token
    if not authorization or not authorization.startswith("Bearer "):
        # Fallback to default Operations Manager for unauthenticated local development calls if configured
        if settings.ENVIRONMENT == "development":
            demo_data = DEMO_USER_PROFILES["ops@qswarm.io"]
            user_role = demo_data["role"]
            from app.core.permissions import ROLE_PERMISSIONS
            perms = [p.value for p in ROLE_PERMISSIONS.get(user_role, set())]
            return CurrentUser(
                user_id=demo_data["user_id"],
                email=demo_data["email"],
                organization_id=demo_data["organization_id"],
                role=user_role,
                permissions=perms,
            )
        raise UnauthorizedError("Missing or invalid Authorization header.")

    token = authorization.split(" ")[1]

    try:
        # Decode Supabase JWT
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        email: str = payload.get("email", "")
        user_metadata = payload.get("user_metadata", {})
        
        # Extract role or fallback to DISPATCHER
        raw_role = user_metadata.get("role", "DISPATCHER")
        try:
            user_role = AppRole(raw_role)
        except ValueError:
            user_role = AppRole.DISPATCHER

        org_id = user_metadata.get("organization_id", "00000000-0000-0000-0000-000000000001")

        from app.core.permissions import ROLE_PERMISSIONS
        perms = [p.value for p in ROLE_PERMISSIONS.get(user_role, set())]

        return CurrentUser(
            user_id=user_id,
            email=email,
            organization_id=org_id,
            role=user_role,
            permissions=perms,
        )

    except JWTError as e:
        logger.warning(f"JWT Verification failed: {str(e)}")
        # Check if email is in DEMO_USER_PROFILES
        raise UnauthorizedError("Invalid or expired Supabase authentication token.")


def require_permission(permission: Permission):
    """FastAPI Dependency factory enforcing granular RBAC permission."""
    async def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.can(permission):
            raise ForbiddenError(permission.value)
        return current_user

    return permission_checker
