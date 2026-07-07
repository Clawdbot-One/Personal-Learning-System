"""认证路由 — 注册/登录/当前用户"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserLogin, TokenResponse, UserInfo
from ..auth import hash_password, verify_password, create_access_token, get_current_user, get_user_level

router = APIRouter(prefix="/api/v1/auth", tags=["认证"])


def _user_to_info(user: User) -> UserInfo:
    level = get_user_level(user.total_points)
    return UserInfo(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar=user.avatar,
        bio=user.bio,
        total_points=user.total_points,
        streak_days=user.streak_days,
        level_name=level["name"],
        level_icon=level["icon"],
        created_at=user.created_at,
    )


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    # 检查重复
    if db.query(User).filter((User.username == data.username) | (User.email == data.email)).first():
        raise HTTPException(status_code=400, detail="用户名或邮箱已存在")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=_user_to_info(user))


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == data.account) | (User.email == data.account)
    ).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名/邮箱或密码错误")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=_user_to_info(user))


@router.get("/me", response_model=UserInfo)
def get_me(user: User = Depends(get_current_user)):
    return _user_to_info(user)
