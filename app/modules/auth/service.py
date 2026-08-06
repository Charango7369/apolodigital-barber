#app\modules\auth\service.py
from fastapi import HTTPException, status
from app.modules.users.repository import UserRepository
from app.core.security import verify_and_update_password, create_access_token
from app.modules.auth.schemas import Token, LoginRequest

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def login(self, request: LoginRequest) -> Token:
        user = await self.user_repo.get_by_email_and_tenant(
            email=request.email,
            tenant_id=request.tenant_id
        )

        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

        if not user:
            raise credentials_exception

        is_valid, new_hash = verify_and_update_password(request.password, user.hashed_password)
        if not is_valid:
            raise credentials_exception

        if new_hash:
            user.hashed_password = new_hash
            await self.user_repo.session.commit()

        access_token = create_access_token(
            subject=user.id,
            tenant_id=user.tenant_id,
            role=user.role
        )

        return Token(access_token=access_token, token_type="bearer")