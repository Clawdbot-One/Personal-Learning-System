"""Critical thinking routes (argument analysis)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..engines.critical_thinking import CriticalThinkingEngine
from ..models import CriticalAnalysis, User
from ..rewards.engine import RewardService
from ..schemas import CriticalAnalyzeIn, CriticalAnalysisOut

router = APIRouter(prefix="/critical", tags=["critical"])


@router.post("/analyze", response_model=CriticalAnalysisOut, status_code=status.HTTP_201_CREATED)
def analyze(payload: CriticalAnalyzeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = CriticalThinkingEngine.analyze(payload.source_text, payload.mode)
    analysis = CriticalAnalysis(
        user_id=user.id,
        source_text=payload.source_text,
        mode=result["mode"],
        conclusion=result["conclusion"],
        reasons=result["reasons"],
        ambiguous_terms=result["ambiguous_terms"],
        assumptions=result["assumptions"],
        fallacies=result["fallacies"],
        evidence_levels=result["evidence_levels"],
        credibility_score=result["credibility_score"],
    )
    db.add(analysis)
    db.flush()
    RewardService.grant(db, user, "social", "critical_analysis", 4, reason="完成批判性分析")
    RewardService.check_achievements(db, user)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.get("", response_model=list[CriticalAnalysisOut])
def list_analyses(limit: int = 30, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(CriticalAnalysis).where(CriticalAnalysis.user_id == user.id).order_by(CriticalAnalysis.created_at.desc()).limit(limit)
    ).all())


@router.get("/{analysis_id}", response_model=CriticalAnalysisOut)
def get_analysis(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.get(CriticalAnalysis, analysis_id)
    if not a or a.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(404, "分析记录不存在")
    return a


@router.post("/feynman-check")
def feynman_check(explanation: str, user: User = Depends(get_current_user)):
    from ..engines.knowledge_action import KnowledgeActionEngine
    return KnowledgeActionEngine.feynman_check(explanation)
