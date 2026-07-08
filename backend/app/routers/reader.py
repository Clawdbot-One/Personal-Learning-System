"""Sponge reading routes (books + 3-layer notes + report)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..engines.sponge_reading import SpongeReadingEngine
from ..models import ReadingBook, ReadingNote, User
from ..rewards.engine import RewardService
from ..schemas import BookCreate, BookOut, NoteCreate, NoteOut

router = APIRouter(prefix="/reader", tags=["reader"])


@router.get("/books", response_model=list[BookOut])
def list_books(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(ReadingBook).where(ReadingBook.user_id == user.id).order_by(ReadingBook.created_at.desc())).all())


@router.post("/books", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def add_book(payload: BookCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = ReadingBook(user_id=user.id, **payload.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get("/books/{book_id}", response_model=BookOut)
def get_book(book_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = db.get(ReadingBook, book_id)
    if not book or book.user_id != user.id:
        raise HTTPException(404, "书籍不存在")
    return book


@router.get("/books/{book_id}/notes", response_model=list[NoteOut])
def list_notes(book_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(ReadingNote).where(ReadingNote.book_id == book_id, ReadingNote.user_id == user.id).order_by(ReadingNote.created_at.desc())
    ).all())


@router.post("/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def add_note(payload: NoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = db.get(ReadingBook, payload.book_id)
    if not book or book.user_id != user.id:
        raise HTTPException(404, "书籍不存在")
    note = ReadingNote(user_id=user.id, **payload.model_dump())
    db.add(note)
    db.flush()
    # auto-build knowledge graph from the note
    SpongeReadingEngine.build_knowledge_from_note(db, note)
    # reward
    RewardService.grant(db, user, "finance", "note", 3, reason="记录阅读笔记")
    RewardService.check_achievements(db, user)
    db.commit()
    db.refresh(note)
    return note


@router.get("/stage")
def reading_stage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SpongeReadingEngine.diagnose_stage(db, user.id)


@router.get("/abilities")
def reading_abilities(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    radar = SpongeReadingEngine.ability_radar(db, user.id)
    return {"axes": list(radar.keys()), "values": list(radar.values()), "radar": radar}


@router.get("/books/{book_id}/report")
def book_report(book_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = db.get(ReadingBook, book_id)
    if not book or book.user_id != user.id:
        raise HTTPException(404, "书籍不存在")
    notes = list(db.scalars(select(ReadingNote).where(ReadingNote.book_id == book_id)).all())
    return {"report": SpongeReadingEngine.generate_report_skeleton(book, notes)}
