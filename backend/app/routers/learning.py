"""学习路由 — 五大引擎API + 学习会话"""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, LearningSession, FocusSession, ReadingNote, ActionItem, KnowledgeNode
from ..schemas import (
    SessionStart, SessionComplete, SessionOut, PracticeRequest, PracticeSubmit,
    ReadingNoteCreate, ReadingNoteOut, ReadingReportRequest, FocusStart, FocusComplete,
    FocusSessionOut, ActionItemCreate, ActionItemOut, FeynmanRequest, CriticalAnalysisRequest,
    MessageResponse,
)
from ..auth import get_current_user, update_streak
from ..reward_service import award_reward
from ..engines import deliberate_practice, sponge_reading, deep_work, knowledge_action, critical_thinking

router = APIRouter(prefix="/api/v1", tags=["学习引擎"])

ENGINE_INFO = [
    {"key": "deliberate_practice", "name": "刻意练习", "book": "Peak", "desc": "自适应难度+技能分解+即时反馈"},
    {"key": "sponge_reading", "name": "海绵阅读法", "book": "海绵阅读法", "desc": "三层笔记+七大能力+四阶段"},
    {"key": "deep_work", "name": "深度工作", "book": "Deep Work", "desc": "番茄钟+专注保护+策略推荐"},
    {"key": "knowledge_action", "name": "知行转化", "book": "知行差距", "desc": "行动计划+费曼输出+间隔复习"},
    {"key": "critical_thinking", "name": "学会提问", "book": "Asking Right Questions", "desc": "11步分析+谬误检测+证据分级"},
]


# ===== 引擎信息 =====
@router.get("/learning/engines")
def get_engines():
    return {"engines": ENGINE_INFO}


# ===== 学习会话 =====
@router.post("/learning/sessions", response_model=SessionOut)
def start_session(data: SessionStart, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    session = LearningSession(
        user_id=user.id,
        plan_id=data.plan_id,
        engine_type=data.engine_type,
        difficulty_level=data.difficulty_level,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


@router.post("/learning/sessions/{session_id}/complete", response_model=MessageResponse)
def complete_session(session_id: str, data: SessionComplete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(LearningSession.id == session_id, LearningSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    session.performance_score = data.performance_score
    session.duration_minutes = data.duration_minutes
    session.session_data = json.dumps(data.session_data, ensure_ascii=False)
    session.completed_at = datetime.now(timezone.utc)
    db.commit()

    reward = award_reward(db, user, "session_complete", f"完成{session.engine_type}学习会话")

    return MessageResponse(message="学习会话已完成", data={"reward": reward})


# ===== 刻意练习 =====
@router.post("/learning/practice")
def get_practice(data: PracticeRequest, user: User = Depends(get_current_user)):
    questions = deliberate_practice.generate_practice(data.domain, data.difficulty, data.count)
    return {"questions": questions, "domain": data.domain, "difficulty": data.difficulty}


@router.post("/learning/practice/submit")
def submit_practice(data: PracticeSubmit, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = deliberate_practice.evaluate_practice(data.answers)
    new_difficulty = deliberate_practice.adjust_difficulty(0.5, result["performance_score"])
    return {
        **result,
        "new_difficulty": new_difficulty,
        "score": result["accuracy"],
        "adjusted_difficulty": new_difficulty,
        "message": f"正确 {result['correct_count']}/{result['total']}",
    }


@router.get("/learning/skill-tree/{domain}")
def get_skill_tree(domain: str, user: User = Depends(get_current_user)):
    return deliberate_practice.get_skill_tree(domain)


@router.get("/learning/learning-zone")
def get_learning_zone(difficulty: float = 0.5, performance: float = 0.5, user: User = Depends(get_current_user)):
    return deliberate_practice.get_learning_zone(difficulty, performance)


# ===== 海绵阅读法 =====
@router.post("/reading/notes", response_model=ReadingNoteOut)
def create_reading_note(data: ReadingNoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    note = ReadingNote(
        user_id=user.id,
        book_title=data.book_title,
        author=data.author,
        layer=data.layer,
        content=data.content,
        chapter_info=data.chapter_info,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    award_reward(db, user, "reading_note", f"记录{data.layer}层阅读笔记")
    return ReadingNoteOut.model_validate(note)


@router.get("/reading/notes", response_model=list[ReadingNoteOut])
def list_reading_notes(book_title: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ReadingNote).filter(ReadingNote.user_id == user.id)
    if book_title:
        query = query.filter(ReadingNote.book_title == book_title)
    notes = query.order_by(ReadingNote.created_at.desc()).all()
    return [ReadingNoteOut.model_validate(n) for n in notes]


@router.post("/reading/report")
def generate_reading_report(data: ReadingReportRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notes = db.query(ReadingNote).filter(ReadingNote.user_id == user.id, ReadingNote.book_title == data.book_title).all()
    note_dicts = [{"layer": n.layer, "content": n.content, "chapter_info": n.chapter_info} for n in notes]
    report = sponge_reading.generate_reading_report(data.book_title, note_dicts)
    return report


@router.get("/reading/abilities")
def get_reading_abilities(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notes = db.query(ReadingNote).filter(ReadingNote.user_id == user.id).all()
    sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id, LearningSession.engine_type == "sponge_reading").all()
    note_dicts = [{"layer": n.layer, "content": n.content, "book_title": n.book_title} for n in notes]
    session_dicts = [{"id": s.id} for s in sessions]
    abilities = sponge_reading.assess_reading_abilities(note_dicts, session_dicts)
    stage = sponge_reading.diagnose_reading_stage(abilities)
    return {"abilities": abilities, "stage": stage}


@router.get("/reading/note-guide/{layer}")
def get_note_guide(layer: str, user: User = Depends(get_current_user)):
    return sponge_reading.get_note_layer_guide(layer)


# ===== 深度工作 =====
@router.post("/focus/start", response_model=FocusSessionOut)
def start_focus(data: FocusStart, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    session = FocusSession(
        user_id=user.id,
        task_name=data.task_name,
        work_type=data.work_type,
        strategy=data.strategy,
        planned_minutes=data.planned_minutes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return FocusSessionOut.model_validate(session)


@router.post("/focus/{session_id}/complete", response_model=MessageResponse)
def complete_focus(session_id: str, data: FocusComplete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(FocusSession).filter(FocusSession.id == session_id, FocusSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="专注会话不存在")

    session.actual_minutes = data.actual_minutes
    session.distraction_count = data.distraction_count
    session.completed = True
    session.completed_at = datetime.now(timezone.utc)
    db.commit()

    reward = award_reward(db, user, "focus_complete", f"完成{session.actual_minutes}分钟深度工作")
    return MessageResponse(message="深度工作已完成", data={"reward": reward})


@router.get("/focus/stats")
def get_focus_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(FocusSession).filter(FocusSession.user_id == user.id, FocusSession.completed == True).all()
    session_dicts = [{
        "actual_minutes": s.actual_minutes,
        "planned_minutes": s.planned_minutes,
        "distraction_count": s.distraction_count,
        "work_type": s.work_type,
        "started_at": s.started_at,
    } for s in sessions]
    return deep_work.analyze_focus_stats(session_dicts)


@router.get("/focus/strategies")
def get_strategies(user: User = Depends(get_current_user)):
    from ..engines.deep_work import DEEP_WORK_STRATEGIES
    return {"strategies": [{"key": k, **v} for k, v in DEEP_WORK_STRATEGIES.items()]}


@router.get("/focus/strategy-recommendation")
def get_strategy_recommendation(role: str = "student", flexibility: str = "medium", user: User = Depends(get_current_user)):
    return deep_work.get_strategy_recommendation({"role": role, "flexibility": flexibility})


@router.get("/focus/ritual")
def get_ritual_checklist(user: User = Depends(get_current_user)):
    return {"checklist": deep_work.get_ritual_checklist()}


@router.get("/focus/sessions", response_model=list[FocusSessionOut])
def list_focus_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(FocusSession).filter(FocusSession.user_id == user.id).order_by(FocusSession.started_at.desc()).limit(20).all()
    return [FocusSessionOut.model_validate(s) for s in sessions]


# ===== 知行转化 =====
@router.post("/action/items", response_model=ActionItemOut)
def create_action_item(data: ActionItemCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(user, db)
    review_dates = knowledge_action.generate_review_dates()
    item = ActionItem(
        user_id=user.id,
        knowledge_node_id=data.knowledge_node_id,
        description=data.description,
        due_date=data.due_date,
        review_dates=json.dumps(review_dates, ensure_ascii=False),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ActionItemOut.model_validate(item)


@router.get("/action/items", response_model=list[ActionItemOut])
def list_action_items(status: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ActionItem).filter(ActionItem.user_id == user.id)
    if status:
        query = query.filter(ActionItem.status == status)
    items = query.order_by(ActionItem.created_at.desc()).all()
    return [ActionItemOut.model_validate(i) for i in items]


@router.post("/action/items/{item_id}/complete", response_model=MessageResponse)
def complete_action_item(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(ActionItem).filter(ActionItem.id == item_id, ActionItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="行动项不存在")
    item.status = "completed"
    item.completed_at = datetime.now(timezone.utc)
    db.commit()

    reward = award_reward(db, user, "action_item_done", f"完成行动项：{item.description[:30]}")
    return MessageResponse(message="行动项已完成", data={"reward": reward})


@router.post("/action/feynman")
def feynman_evaluate(data: FeynmanRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = knowledge_action.feynman_evaluate(data.topic, data.explanation)
    reward = award_reward(db, user, "feynman_output", f"费曼输出：{data.topic}")
    return {**result, "reward": reward}


@router.post("/action/green-light")
def green_light_thinking(idea: str = "", user: User = Depends(get_current_user)):
    return knowledge_action.green_light_thinking(idea)


@router.post("/action/plan")
def generate_action_plan(concept: str = "", user: User = Depends(get_current_user)):
    return {"plan": knowledge_action.generate_action_plan(concept)}


@router.get("/action/diagnose")
def diagnose_gap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).count()
    actions = db.query(ActionItem).filter(ActionItem.user_id == user.id, ActionItem.status == "completed").count()
    return knowledge_action.diagnose_knowing_doing_gap(nodes, actions, actions)


# ===== 批判性思维 =====
@router.post("/critical/analyze")
def critical_analyze(data: CriticalAnalysisRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = critical_thinking.analyze_argument(data.text, data.mode)
    reward = award_reward(db, user, "critical_analysis", "完成批判性分析")
    return {**result, "reward": reward}


@router.get("/critical/fallacies")
def get_fallacies(user: User = Depends(get_current_user)):
    from ..engines.critical_thinking import LOGICAL_FALLACIES
    return {"fallacies": LOGICAL_FALLACIES}


@router.get("/critical/questions")
def get_critical_questions(user: User = Depends(get_current_user)):
    return {"questions": critical_thinking.get_critical_questions()}


@router.get("/critical/steps")
def get_critical_steps(user: User = Depends(get_current_user)):
    from ..engines.critical_thinking import CRITICAL_STEPS, EVIDENCE_LEVELS
    return {"steps": CRITICAL_STEPS, "evidence_levels": EVIDENCE_LEVELS}
