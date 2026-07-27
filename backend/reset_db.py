import asyncio
import asyncpg

async def reset_db():
    conn = await asyncpg.connect(
        user='postgres', 
        password='root', 
        database='duraiproject', 
        host='localhost'
    )
    
    await conn.execute('''
        DROP SCHEMA public CASCADE; 
        CREATE SCHEMA public; 
        GRANT ALL ON SCHEMA public TO postgres; 
        GRANT ALL ON SCHEMA public TO public;
    ''')
    
    await conn.close()
    print('Database schema dropped and recreated.')

if __name__ == "__main__":
    asyncio.run(reset_db())
