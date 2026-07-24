import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine("postgresql+asyncpg://postgres:root@localhost:5432/duraiproject", isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TYPE partytype RENAME VALUE 'SUPPLIER' TO 'PURCHASER';"))
            print("Renamed SUPPLIER to PURCHASER")
        except Exception as e:
            print("Error renaming SUPPLIER:", e)
        try:
            await conn.execute(text("ALTER TYPE partytype RENAME VALUE 'CUSTOMER' TO 'SUPPLIER';"))
            print("Renamed CUSTOMER to SUPPLIER")
        except Exception as e:
            print("Error renaming CUSTOMER:", e)

asyncio.run(run())
