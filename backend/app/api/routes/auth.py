from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.future import select
from pydantic import BaseModel

from app.api.deps import SessionDep, CurrentUser
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.core.config import settings

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserRegister(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=Token)
async def login_access_token(
    session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    result = await session.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            user.username, expires_delta=access_token_expires
        )
    )

@router.post("/register")
async def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Register a new user. Only available via API.
    """
    result = await session.execute(select(User).where(User.username == user_in.username))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password)
    )
    session.add(user)
    await session.commit()
    return {"message": "User created successfully"}

@router.get("/me")
async def read_users_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return {"username": current_user.username, "id": current_user.id}
