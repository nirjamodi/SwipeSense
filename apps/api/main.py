from fastapi import FastAPI
from pydantic import BaseModel

import os
from motor.motor_asyncio import AsyncIOMotorClient
import os
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI(title="SwipeSense API")
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="SwipeSense API")

MONGO_URI = os.getenv("MONGO_DB_URI")
MONGO_DB = os.getenv("MONGO_DB_NAME", "creditCards")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "cards")

mongo_client = AsyncIOMotorClient(MONGO_URI) if MONGO_URI else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .db import db

# ---------- Models ----------
class UserProfile(BaseModel):
    is_student: bool
    primary_spend: str  # groceries, travel, dining
    priority: str       # cashback or points

class Transaction(BaseModel):
    category: str
    amount: float


# ---------- Routes ----------
@app.get("/health")
def health():
    return {"status": "ok", "project": "SwipeSense"}


@app.post("/recommend/card")
def recommend_card(user: UserProfile):
    """
    TEMP LOGIC (rule-based placeholder)
    ML will replace this later
    """
    if user.is_student and user.primary_spend == "groceries":
        return {
            "recommended_card": "No-Fee Cashback Card",
            "reason": "Best for student grocery spending"
        }

    if user.primary_spend == "travel" and user.priority == "points":
        return {
            "recommended_card": "Avion Points Card",
            "reason": "Better rewards on expensive travel purchases"
        }

    return {
        "recommended_card": "General Cashback Card",
        "reason": "Balanced rewards for everyday spending"
    }


@app.post("/recommend/transaction")
def recommend_for_transaction(tx: Transaction):
    if tx.amount > 500:
        return {
            "use_card": "Avion Points Card",
            "reason": "High-value purchase earns more points"
        }
    