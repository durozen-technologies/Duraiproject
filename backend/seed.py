import asyncio
from app.db.database import AsyncSessionLocal
from app.models.party import Party

async def seed():
    async with AsyncSessionLocal() as db:
        # Create a supplier
        supplier = Party(
            name="Pioneer Feeds",
            mobile="9876543210",
            type="supplier",
            opening_balance=0,
            current_balance=0
        )
        # Create a customer
        customer = Party(
            name="Sri Murugan Traders",
            mobile="9998887776",
            type="customer",
            opening_balance=0,
            current_balance=0
        )
        
        db.add(supplier)
        db.add(customer)
        await db.commit()
        print("Seeded database with test parties!")

if __name__ == "__main__":
    asyncio.run(seed())
