import asyncio
from app.services.users import get_user_by_email

async def main():
    user = await get_user_by_email('admin@mediflow.ai')
    print(type(user).__name__, user.email if user else None)

asyncio.run(main())
