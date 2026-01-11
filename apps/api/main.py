from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SwipeSense API")
from fastapi.middleware.cors import CORSMiddleware

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

from fastapi import HTTPException

@app.get("/db/health")
async def db_health():
    try:
        await db.command("ping")
        return {"db": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    