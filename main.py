from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from datetime import date

app = FastAPI()

# Указываем папки для шаблонов и статических файлов
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    # Данные для карточек
    cards = [
        {"id": 1, "title": "Card 1", "content": "Content for card 1", "createdAt": "2023-12-10", "reviewDate": "2023-12-09"},
        {"id": 2, "title": "Card 2", "content": "Content for card 2", "createdAt": "2023-12-11", "reviewDate": "2023-12-12"}
    ]
    current_date = str(date.today())
    return templates.TemplateResponse("index.html", {"request": request, "cards": cards, "current_date": current_date})
