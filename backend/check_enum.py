import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine("postgresql+asyncpg://postgres:root@localhost:5432/duraiproject")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'partytype';"))
        for row in res:
            print("Existing enum:", row[0])

asyncio.run(run())
