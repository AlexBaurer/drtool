from fastapi import FastAPI, HTTPException, Request, Query
from pydantic import BaseModel, ConfigDict
from typing import List
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from datetime import date, datetime
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from app.cards.models import CardOrm
from app.db import async_session_maker

app = FastAPI()

class NewCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    content: str
    date_review: datetime

class Card(NewCard):
    id: int
    created_at: datetime
    updated_at: datetime
    author: str

    class Config:
        orm_mode=True


app.mount("/static", StaticFiles(directory="static"), name="static")

# Инициализация Jinja2
templates = Jinja2Templates(directory="templates")

# Данные временно хранятся в памяти
# cards = [
#     Card(id=0, title="T1", content="c1", created_at=datetime.now(), updated_at=datetime.now(), date_review=datetime.now(), author="au1"),
# ]

logs = []

async def get_all_cards_from_db():
    global cards
    try:
        async with async_session_maker() as session:
            q = select(CardOrm)
            res = await session.execute(q)
            curr = res.scalars()
            cards = [i for i in curr]
        return cards
    except:
        pass

async def get_card_by_id(card_id):
    try:
        async with async_session_maker() as session:
            q = select(CardOrm).filter_by(id=card_id)
            res = await session.execute(q)
        return res.scalar_one_or_none()
    except:
        pass

async def add_card(card):
    try:
        async with async_session_maker() as session:
            session.add(card)
            await session.commit()
    except SQLAlchemyError as e:
        error = str(e.__cause__)
        print(error)
    return Card.from_orm(card)


# @app.get("/api/cards", response_model=List[Card])
# async def get_cards():
#     await get_all_cards_from_db()
#     return cards

@app.post("/api/cards", response_model=Card)
async def create_card(card: NewCard):
    card = CardOrm(title=card.title, content=card.content, date_review=card.date_review,
         created_at=datetime.now(), updated_at=datetime.now(), author='kek')
    await add_card(card)
    logs.append(card)
    return Card.from_orm(card)

@app.put("/api/cards/{card_id}")
async def update_card(card_id: int, updated_card: Card):
    print(card_id)
    card = await get_card_by_id(card_id)
    print(card)
    if card.id == card_id:
        card.title = updated_card.title
        card.content = updated_card.content
        card.date_review = updated_card.date_review
        card.updated_at = updated_card.updated_at
        await add_card(card)
        return updated_card
    raise HTTPException(status_code=404, detail="Card not found")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/logs", response_model=List[Card])
async def get_logs():
    return logs

@app.get("/api/cards", response_model=List[Card])
async def filter_cards(
    request: Request,
    from_date: str | None = Query(None, alias="from_date"),
    to_date: str | None = Query(None, alias="to_date"),
    author: str | None = Query(None),
):

    # print('fd',from_date,'tod', to_date, 'a',author)
    async with async_session_maker() as session:
        query = select(CardOrm)
        if from_date:
            from_date = datetime.strptime(from_date, "%Y-%m-%d").date()
            query = query.where(CardOrm.date_review >= from_date)
        if to_date:
            to_date = datetime.strptime(to_date, "%Y-%m-%d").date()
            query = query.where(CardOrm.date_review <= to_date)
        if author:
            query = query.where(CardOrm.author.ilike(f"%{author}%"))

        print(query)

        result = await session.execute(query)
        f_cards = result.scalars()
        filtered_cards = [i for i in f_cards]

    return filtered_cards