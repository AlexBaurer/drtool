from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from typing import List
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.cards.models import CardOrm

app = FastAPI()

class NewCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    content: str
    date_review: str

class Card(NewCard):
    id: int
    created_at: datetime
    updated_at: datetime
    author: str


app.mount("/static", StaticFiles(directory="static"), name="static")

# Инициализация Jinja2
templates = Jinja2Templates(directory="templates")

# Данные временно хранятся в памяти
cards = [
    Card(id=0, title="T1", content="c1", created_at=datetime.now(), updated_at=datetime.now(), date_review="2023-12-15", author="au1"),
]

logs = []

@app.get("/api/cards", response_model=List[Card])
async def get_cards(db: Session):
    return db.query(CardOrm).all()

@app.post("/api/cards", response_model=Card)
async def create_card(card: NewCard):
    card = Card(title=card.title, content=card.content, date_review=card.date_review,
         id=max(c.id for c in cards) + 1 if cards else 0, created_at=datetime.now(),
         updated_at=datetime.now(), author='kek')
    cards.append(card)
    logs.append(card)
    return card

@app.put("/api/cards/{card_id}")
async def update_card(card_id: int, updated_card: Card):
    for idx, card in enumerate(cards):
        if card.id == card_id:
            cards[idx].title = updated_card.title
            cards[idx].content = updated_card.content
            cards[idx].date_review = updated_card.date_review
            cards[idx].updated_at = datetime.now()
            logs.append(updated_card)
            return updated_card
    raise HTTPException(status_code=404, detail="Card not found")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/logs", response_model=List[Card])
async def get_logs():
    return logs
