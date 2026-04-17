import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models import *
from game_engine import init_hand, apply_action, set_board_cards, end_hand
from ai_advisor import get_advice
from storage import (
    save_session, load_session, list_sessions,
    load_all_profiles, get_or_create_profile, update_profile, update_profiles_from_hand
)

app = FastAPI(title="Beat The Odds - Poker Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Sessions ──────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions():
    return list_sessions()


@app.post("/api/sessions", response_model=SessionState)
def create_session(req: CreateSessionRequest):
    session = SessionState(
        name=req.name,
        small_blind=req.small_blind,
        big_blind=req.big_blind,
        me=req.me,
    )
    session.players.append(Player(name=req.me, seat=req.my_seat, chips=req.my_chips))
    get_or_create_profile(req.me)
    save_session(session)
    return session


@app.get("/api/sessions/{session_id}", response_model=SessionState)
def get_session(session_id: str):
    try:
        return load_session(session_id)
    except FileNotFoundError:
        raise HTTPException(404, "Session not found")


@app.delete("/api/sessions/{session_id}")
def end_session(session_id: str):
    session = load_session(session_id)
    session.status = "ended"
    save_session(session)
    return {"ok": True}


@app.delete("/api/sessions/{session_id}/delete")
def delete_session(session_id: str):
    from pathlib import Path
    path = Path(__file__).parent.parent / "data" / "sessions" / f"{session_id}.json"
    if path.exists():
        path.unlink()
    return {"ok": True}


# ── Players in session ────────────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/players", response_model=SessionState)
def add_player(session_id: str, req: AddPlayerRequest):
    session = load_session(session_id)
    if any(p.name == req.name for p in session.players):
        raise HTTPException(400, f"Player {req.name} already in session")
    if any(p.seat == req.seat for p in session.players):
        raise HTTPException(400, f"Seat {req.seat} already taken")
    session.players.append(Player(name=req.name, seat=req.seat, chips=req.chips))
    get_or_create_profile(req.name)
    save_session(session)
    return session


@app.patch("/api/sessions/{session_id}/players/{name}/seat", response_model=SessionState)
def change_seat(session_id: str, name: str, seat: int):
    session = load_session(session_id)
    if any(p.seat == seat and p.name != name for p in session.players):
        raise HTTPException(400, f"座位 {seat} 已有人")
    for p in session.players:
        if p.name == name:
            p.seat = seat
            break
    save_session(session)
    return session


@app.delete("/api/sessions/{session_id}/players/{name}", response_model=SessionState)
def remove_player(session_id: str, name: str):
    session = load_session(session_id)
    session.players = [p for p in session.players if p.name != name]
    save_session(session)
    return session


@app.patch("/api/sessions/{session_id}/players/{name}/chips", response_model=SessionState)
def add_chips(session_id: str, name: str, amount: float):
    session = load_session(session_id)
    for p in session.players:
        if p.name == name:
            p.chips += amount
            break
    save_session(session)
    return session


# ── Hand management ───────────────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/hand/start", response_model=SessionState)
def start_hand(session_id: str, req: StartHandRequest):
    session = load_session(session_id)
    if session.current_hand and session.current_hand.status == "active":
        raise HTTPException(400, "A hand is already in progress")

    try:
        hand = init_hand(session, req.dealer_seat, req.my_cards, req.participants)
    except ValueError as e:
        raise HTTPException(400, str(e))

    session.current_hand = hand
    session.last_dealer_seat = req.dealer_seat
    save_session(session)
    return session


@app.post("/api/sessions/{session_id}/hand/action", response_model=SessionState)
def record_action(session_id: str, req: RecordActionRequest):
    session = load_session(session_id)
    if not session.current_hand or session.current_hand.status != "active":
        raise HTTPException(400, "No active hand")

    try:
        session.current_hand = apply_action(
            session.current_hand, req.player, req.action_type, req.amount
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    save_session(session)
    return session


@app.post("/api/sessions/{session_id}/hand/board", response_model=SessionState)
def update_board(session_id: str, req: UpdateBoardRequest):
    session = load_session(session_id)
    if not session.current_hand:
        raise HTTPException(400, "No active hand")
    session.current_hand = set_board_cards(session.current_hand, req.cards)
    save_session(session)
    return session


@app.post("/api/sessions/{session_id}/hand/end", response_model=SessionState)
def finish_hand(session_id: str, req: EndHandRequest):
    session = load_session(session_id)
    if not session.current_hand:
        raise HTTPException(400, "No active hand")

    session = end_hand(session, req.winners, req.winner_amounts)
    if session.hands_history:
        update_profiles_from_hand(session.hands_history[-1])
    save_session(session)
    return session


# ── AI Advice ─────────────────────────────────────────────────────────────────

@app.get("/api/sessions/{session_id}/advice")
def get_hand_advice(session_id: str):
    session = load_session(session_id)
    if not session.current_hand or session.current_hand.status != "active":
        raise HTTPException(400, "No active hand")

    hand = session.current_hand
    if hand.current_actor != session.me:
        return {"message": f"Not your turn, waiting for {hand.current_actor}"}

    profiles = load_all_profiles()
    advice = get_advice(hand, session, profiles)
    return advice


# ── Player Profiles ───────────────────────────────────────────────────────────

@app.get("/api/players")
def get_all_profiles():
    return load_all_profiles()


@app.get("/api/players/{name}")
def get_profile(name: str):
    return get_or_create_profile(name)


@app.put("/api/players/{name}", response_model=PlayerProfile)
def update_player_profile(name: str, req: UpdatePlayerProfileRequest):
    return update_profile(
        name,
        notes=req.notes,
        tags=req.tags,
        vpip_estimate=req.vpip_estimate,
        pfr_estimate=req.pfr_estimate,
        aggression=req.aggression,
        tendencies=req.tendencies,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
