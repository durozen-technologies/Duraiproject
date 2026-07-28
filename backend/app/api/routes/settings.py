from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.models.setting import Setting
from pydantic import BaseModel

router = APIRouter()

class SettingUpdate(BaseModel):
    value: str

@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalars().first()
    if setting:
        return {"key": setting.key, "value": setting.value}
    return {"key": key, "value": None}

@router.put("/{key}")
async def update_setting(key: str, setting_data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalars().first()
    
    if setting:
        setting.value = setting_data.value
    else:
        setting = Setting(key=key, value=setting_data.value)
        db.add(setting)
        
    await db.commit()
    await db.refresh(setting)
    return {"key": setting.key, "value": setting.value}
