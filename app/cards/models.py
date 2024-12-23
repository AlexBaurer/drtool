from sqlalchemy import ForeignKey, text, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db import Base, str_uniq, int_pk, str_null_true, created_at, updated_at
from datetime import date


class CardOrm(Base):
    __tablename__ = "Cards"

    id: Mapped[int_pk]
    author: Mapped[str]
    created_at: Mapped[created_at]
    updated_at: Mapped[updated_at]
    title: Mapped[str]
    content: Mapped[str]
    date_review: Mapped[date]