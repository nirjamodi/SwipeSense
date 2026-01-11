import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "swipesense")

# Prevent infinite hang if MongoDB is down
client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=2000)

db = client[DB_NAME]
users = db["users"]
