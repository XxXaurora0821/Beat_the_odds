import json
from pathlib import Path

from models import (
    ActionType,
    HandState,
    PlayerProfile,
    SessionState,
    Street,
    now_iso,
)

DATA_DIR = Path(__file__).parent.parent / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
PLAYERS_FILE = DATA_DIR / "players.json"

SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

_VOLUNTARY_PREFLOP = {ActionType.CALL, ActionType.BET, ActionType.RAISE, ActionType.ALL_IN}
_AGGRESSIVE_PREFLOP = {ActionType.BET, ActionType.RAISE, ActionType.ALL_IN}
_AGGRESSIVE_POSTFLOP = {ActionType.BET, ActionType.RAISE, ActionType.ALL_IN}
_PASSIVE_POSTFLOP = {ActionType.CALL, ActionType.CHECK}


def _smoothed_pct(yes: int, opp: int, prior_yes: int, prior_total: int) -> float | None:
    if opp <= 0:
        return None
    return round((yes + prior_yes) * 100.0 / (opp + prior_total), 1)


def _safe_div(numerator: float, denominator: float) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator / denominator, 2)


def _derive_auto_tags(profile: PlayerProfile) -> list[str]:
    tags: list[str] = []
    vpip = profile.auto_vpip
    pfr = profile.auto_pfr
    af = profile.auto_aggression_factor

    if vpip is not None and pfr is not None:
        gap = vpip - pfr
        if vpip >= 35 and pfr >= 24:
            tags.append("松凶(LAG)")
        elif vpip <= 22 and pfr >= 16:
            tags.append("紧凶(TAG)")
        elif vpip <= 18 and pfr <= 12:
            tags.append("超紧(Nit)")
        elif vpip >= 35 and gap >= 18:
            tags.append("松被动")
        elif vpip <= 24 and pfr <= 14:
            tags.append("偏紧")

    if af is not None:
        if af >= 2.5:
            tags.append("后手激进")
        elif af <= 0.8 and (vpip or 0) >= 28:
            tags.append("跟注偏多")

    if profile.auto_three_bet is not None and profile.auto_three_bet >= 9:
        tags.append("3bet偏多")

    return tags


def _derive_auto_summary(profile: PlayerProfile) -> str:
    if profile.hands_played <= 0:
        return ""

    chunks: list[str] = [f"样本{profile.hands_played}手"]
    if profile.auto_vpip is not None and profile.auto_pfr is not None:
        chunks.append(f"VPIP/PFR≈{profile.auto_vpip:.0f}/{profile.auto_pfr:.0f}")
    if profile.auto_three_bet is not None:
        chunks.append(f"3bet≈{profile.auto_three_bet:.0f}%")
    if profile.auto_aggression_factor is not None:
        chunks.append(f"AF≈{profile.auto_aggression_factor:.2f}")
    if profile.auto_showdown_win is not None:
        chunks.append(f"摊牌胜率≈{profile.auto_showdown_win:.0f}%")
    if profile.auto_tags:
        chunks.append("自动标签:" + "、".join(profile.auto_tags))

    return " | ".join(chunks)


def _recompute_profile(profile: PlayerProfile) -> None:
    profile.vpip_opp = max(profile.vpip_opp, 0)
    profile.vpip_yes = max(profile.vpip_yes, 0)
    profile.pfr_opp = max(profile.pfr_opp, 0)
    profile.pfr_yes = max(profile.pfr_yes, 0)
    profile.three_bet_opp = max(profile.three_bet_opp, 0)
    profile.three_bet_yes = max(profile.three_bet_yes, 0)
    profile.postflop_bet_raise = max(profile.postflop_bet_raise, 0)
    profile.postflop_call_check = max(profile.postflop_call_check, 0)
    profile.showdown_seen = max(profile.showdown_seen, 0)
    profile.showdown_won = max(profile.showdown_won, 0)

    profile.auto_vpip = _smoothed_pct(profile.vpip_yes, profile.vpip_opp, prior_yes=3, prior_total=10)
    profile.auto_pfr = _smoothed_pct(profile.pfr_yes, profile.pfr_opp, prior_yes=2, prior_total=10)
    profile.auto_three_bet = _smoothed_pct(profile.three_bet_yes, profile.three_bet_opp, prior_yes=1, prior_total=8)
    if profile.postflop_bet_raise == 0 and profile.postflop_call_check == 0:
        profile.auto_aggression_factor = None
    else:
        profile.auto_aggression_factor = _safe_div(
            profile.postflop_bet_raise, max(profile.postflop_call_check, 1)
        )
    profile.auto_showdown_win = _smoothed_pct(profile.showdown_won, profile.showdown_seen, prior_yes=1, prior_total=4)
    profile.auto_tags = _derive_auto_tags(profile)
    profile.auto_summary = _derive_auto_summary(profile)


def _load_profiles_raw() -> dict[str, PlayerProfile]:
    if not PLAYERS_FILE.exists():
        return {}

    data = json.loads(PLAYERS_FILE.read_text())
    profiles: dict[str, PlayerProfile] = {}
    for name, payload in data.items():
        try:
            profiles[name] = PlayerProfile.model_validate(payload)
        except Exception:
            continue
    return profiles


def _write_profiles(profiles: dict[str, PlayerProfile]) -> None:
    PLAYERS_FILE.write_text(
        json.dumps(
            {name: p.model_dump() for name, p in profiles.items()},
            indent=2,
            ensure_ascii=False,
        )
    )


def save_session(session: SessionState) -> None:
    path = SESSIONS_DIR / f"{session.id}.json"
    path.write_text(session.model_dump_json(indent=2))


def load_session(session_id: str) -> SessionState:
    path = SESSIONS_DIR / f"{session_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Session {session_id} not found")
    return SessionState.model_validate_json(path.read_text())


def list_sessions() -> list[dict]:
    sessions = []
    for f in sorted(SESSIONS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            sessions.append({
                "id": data["id"],
                "name": data["name"],
                "created_at": data["created_at"],
                "status": data.get("status", "active"),
                "hand_count": data.get("hand_count", 0),
                "player_count": len(data.get("players", [])),
            })
        except Exception:
            pass
    return sessions


def load_all_profiles() -> dict[str, PlayerProfile]:
    profiles = _load_profiles_raw()

    dirty = False
    for profile in profiles.values():
        before = (
            profile.auto_vpip,
            profile.auto_pfr,
            profile.auto_three_bet,
            profile.auto_aggression_factor,
            profile.auto_showdown_win,
            tuple(profile.auto_tags),
            profile.auto_summary,
        )
        _recompute_profile(profile)
        after = (
            profile.auto_vpip,
            profile.auto_pfr,
            profile.auto_three_bet,
            profile.auto_aggression_factor,
            profile.auto_showdown_win,
            tuple(profile.auto_tags),
            profile.auto_summary,
        )
        if before != after:
            dirty = True

    if dirty:
        _write_profiles(profiles)

    return profiles


def save_profile(profile: PlayerProfile) -> None:
    profiles = _load_profiles_raw()
    _recompute_profile(profile)
    profiles[profile.name] = profile
    _write_profiles(profiles)


def get_or_create_profile(name: str) -> PlayerProfile:
    profiles = load_all_profiles()
    if name not in profiles:
        profile = PlayerProfile(name=name)
        _recompute_profile(profile)
        save_profile(profile)
        return profile
    return profiles[name]


def update_profile(name: str, **kwargs) -> PlayerProfile:
    profile = get_or_create_profile(name)
    for k, v in kwargs.items():
        if v is not None and hasattr(profile, k):
            setattr(profile, k, v)
    profile.last_updated = now_iso()
    save_profile(profile)
    return profile


def update_profiles_from_hand(hand: HandState) -> None:
    participants = list(hand.player_stacks.keys())
    if not participants:
        return

    deltas: dict[str, dict[str, int]] = {
        name: {
            "hands_played": 1,
            "vpip_opp": 1,
            "vpip_yes": 0,
            "pfr_opp": 1,
            "pfr_yes": 0,
            "three_bet_opp": 0,
            "three_bet_yes": 0,
            "postflop_bet_raise": 0,
            "postflop_call_check": 0,
            "showdown_seen": 0,
            "showdown_won": 0,
        }
        for name in participants
    }

    preflop_actions = [a for a in hand.actions if a.street == Street.PREFLOP]
    forced_blind_indices: set[int] = set()
    for idx, action in enumerate(preflop_actions[:2]):
        if action.action_type == ActionType.BET and action.amount > 0:
            forced_blind_indices.add(idx)

    non_blind_preflop = []
    for idx, action in enumerate(preflop_actions):
        if idx in forced_blind_indices:
            continue
        non_blind_preflop.append(action)
        if action.player not in deltas:
            continue
        if action.action_type in _VOLUNTARY_PREFLOP:
            deltas[action.player]["vpip_yes"] = 1
        if action.action_type in _AGGRESSIVE_PREFLOP:
            deltas[action.player]["pfr_yes"] = 1

    open_raiser: str | None = None
    three_bet_done = False
    faced_open_players: set[str] = set()
    for action in non_blind_preflop:
        if action.player not in deltas:
            continue
        is_aggressive = action.action_type in _AGGRESSIVE_PREFLOP
        if open_raiser is None:
            if is_aggressive:
                open_raiser = action.player
            continue

        if action.player == open_raiser:
            continue

        faced_open_players.add(action.player)
        if is_aggressive and not three_bet_done:
            deltas[action.player]["three_bet_yes"] += 1
            three_bet_done = True

    for name in faced_open_players:
        deltas[name]["three_bet_opp"] += 1

    for action in hand.actions:
        if action.player not in deltas:
            continue
        if action.street not in (Street.FLOP, Street.TURN, Street.RIVER):
            continue

        if action.action_type in _AGGRESSIVE_POSTFLOP:
            deltas[action.player]["postflop_bet_raise"] += 1
        elif action.action_type in _PASSIVE_POSTFLOP:
            deltas[action.player]["postflop_call_check"] += 1

    went_showdown = hand.street == Street.SHOWDOWN or (
        hand.status == "complete" and len(hand.active_players) > 1 and bool(hand.winners)
    )
    if went_showdown:
        for name in hand.active_players:
            if name in deltas:
                deltas[name]["showdown_seen"] += 1
        for name in hand.winners:
            if name in deltas:
                deltas[name]["showdown_won"] += 1

    profiles = _load_profiles_raw()
    for name, delta in deltas.items():
        profile = profiles.get(name) or PlayerProfile(name=name)
        profile.hands_played += delta["hands_played"]
        profile.vpip_opp += delta["vpip_opp"]
        profile.vpip_yes += delta["vpip_yes"]
        profile.pfr_opp += delta["pfr_opp"]
        profile.pfr_yes += delta["pfr_yes"]
        profile.three_bet_opp += delta["three_bet_opp"]
        profile.three_bet_yes += delta["three_bet_yes"]
        profile.postflop_bet_raise += delta["postflop_bet_raise"]
        profile.postflop_call_check += delta["postflop_call_check"]
        profile.showdown_seen += delta["showdown_seen"]
        profile.showdown_won += delta["showdown_won"]
        profile.last_updated = now_iso()
        _recompute_profile(profile)
        profiles[name] = profile

    _write_profiles(profiles)
