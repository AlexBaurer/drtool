from sqlalchemy import ForeignKey, text, Text, Column, Integer, String, DateTime, Date, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db import Base
from datetime import datetime


class CardOrm(Base):
    __tablename__ = "Cards"

    id = Column(Integer, primary_key=True)
    author = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=datetime.now)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    date_review = Column(Date)


class LogOrm(Base):
    __tablename__ = "Logs"

    id = Column(Integer, primary_key=True)
    card_id = Column(ForeignKey("Cards.id"), nullable=False)
    log_content = Column(JSONB, nullable=False)
    update_author = Column(String)

class User(Base):
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)
    full_real_name = Column(String)
    auth_method = Column(String)


# class CardOrm(Base):
#     __tablename__ = "Cards"
#
#     id: Mapped[int_pk]
#     author: Mapped[str]
#     created_at: Mapped[created_at]
#     updated_at: Mapped[updated_at]
#     title: Mapped[str]
#     content: Mapped[str]
#     date_review: Mapped[date]
#
#
# class Log(Base):
#     __tablename__ = "Logs"
#
#     id: Mapped[int_pk]
#     log_content: Mapped[dict] = mapped_column(JSONB, nullable=False)