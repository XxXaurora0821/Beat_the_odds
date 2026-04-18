import json
import os
import re
from typing import List

import anthropic

from models import HandState, PlayerProfile, SessionState, Street

client = None


def get_client():
    global client
    if client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        client = anthropic.Anthropic(api_key=api_key)
    return client


SUIT_MAP = {"s": "♠", "h": "♥", "d": "♦", "c": "♣"}


def fmt_card(c: str) -> str:
    if len(c) == 2:
        return c[0].upper() + SUIT_MAP.get(c[1].lower(), c[1])
    return c


def fmt_cards(cards: List[str]) -> str:
    return " ".join(fmt_card(c) for c in cards)


def _fmt_num(value: float) -> str:
    return f"{value:g}"


def _seats_in_order_after(all_seats: list[int], after_seat: int) -> list[int]:
    seats = sorted(all_seats)
    idx = None
    for i, seat in enumerate(seats):
        if seat > after_seat:
            idx = i
            break
    if idx is None:
        return seats
    return seats[idx:] + seats[:idx]


def _position_labels(n_players: int) -> list[str]:
    mapping = {
        2: ["SB/BTN", "BB"],
        3: ["SB", "BB", "BTN"],
        4: ["SB", "BB", "UTG", "BTN"],
        5: ["SB", "BB", "UTG", "CO", "BTN"],
        6: ["SB", "BB", "UTG", "HJ", "CO", "BTN"],
        7: ["SB", "BB", "UTG", "LJ", "HJ", "CO", "BTN"],
        8: ["SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO", "BTN"],
        9: ["SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN"],
    }
    return mapping.get(n_players, [f"P{i+1}" for i in range(n_players)])


def _position_map(hand: HandState, session: SessionState) -> dict[str, str]:
    seat_by_name = {p.name: p.seat for p in session.players if p.name in hand.player_stacks}
    name_by_seat = {seat: name for name, seat in seat_by_name.items()}
    ordered_seats = _seats_in_order_after(list(name_by_seat.keys()), hand.dealer_seat)
    labels = _position_labels(len(ordered_seats))
    return {
        name_by_seat[seat]: labels[idx]
        for idx, seat in enumerate(ordered_seats)
        if idx < len(labels)
    }


def _build_action_line(hand: HandState) -> str:
    action_code = {
        "fold": "F",
        "check": "X",
        "call": "C",
        "bet": "B",
        "raise": "R",
        "all_in": "AI",
    }
    ordered_streets = [Street.PREFLOP, Street.FLOP, Street.TURN, Street.RIVER, Street.SHOWDOWN]
    chunks: list[str] = []
    for street in ordered_streets:
        actions = [a for a in hand.actions if a.street == street]
        if not actions:
            continue
        seq = []
        for a in actions:
            code = action_code.get(a.action_type.value, a.action_type.value.upper())
            amount = _fmt_num(a.amount) if a.amount > 0 else ""
            seq.append(f"{a.player}:{code}{amount}")
        chunks.append(f"{street.value.upper()} {' -> '.join(seq)}")
    return " | ".join(chunks)


def _hero_state(hand: HandState, session: SessionState) -> dict:
    me = session.me or ""
    hero_stack = hand.player_stacks.get(me, 0.0)
    to_call = max(0.0, hand.bet_to_call - hand.current_bets.get(me, 0.0))
    pot_odds = None
    if to_call > 0:
        pot_odds = round(to_call / (hand.pot + to_call) * 100.0, 1)

    active_opponent_stacks = [
        s for n, s in hand.player_stacks.items()
        if n != me and n in hand.active_players
    ]
    effective_vs_big = None
    effective_vs_short = None
    if active_opponent_stacks:
        effective_vs_big = round(min(hero_stack, max(active_opponent_stacks)), 2)
        effective_vs_short = round(min(hero_stack, min(active_opponent_stacks)), 2)

    spr = None
    if hand.pot > 0 and effective_vs_big is not None:
        spr = round(effective_vs_big / hand.pot, 2)

    return {
        "hero_stack": hero_stack,
        "to_call": to_call,
        "pot_odds": pot_odds,
        "effective_vs_big": effective_vs_big,
        "effective_vs_short": effective_vs_short,
        "spr": spr,
    }


def _manual_profile_bits(profile: PlayerProfile) -> list[str]:
    bits: list[str] = []
    if profile.tags:
        bits.append("手动标签:" + "、".join(profile.tags))
    if profile.vpip_estimate is not None:
        bits.append(f"手动VPIP≈{profile.vpip_estimate:.0f}%")
    if profile.pfr_estimate is not None:
        bits.append(f"手动PFR≈{profile.pfr_estimate:.0f}%")
    if profile.aggression:
        bits.append(f"手动风格:{profile.aggression}")
    if profile.tendencies:
        bits.append(f"手动倾向:{profile.tendencies}")
    if profile.notes:
        bits.append(f"手动备注:{profile.notes}")
    return bits


def _auto_profile_bits(profile: PlayerProfile) -> list[str]:
    bits: list[str] = []
    if profile.hands_played > 0:
        bits.append(f"自动样本:{profile.hands_played}手")
    if profile.auto_vpip is not None:
        bits.append(f"自动VPIP≈{profile.auto_vpip:.0f}%")
    if profile.auto_pfr is not None:
        bits.append(f"自动PFR≈{profile.auto_pfr:.0f}%")
    if profile.auto_three_bet is not None:
        bits.append(f"自动3bet≈{profile.auto_three_bet:.0f}%")
    if profile.auto_aggression_factor is not None:
        bits.append(f"自动AF≈{profile.auto_aggression_factor:.2f}")
    if profile.auto_showdown_win is not None:
        bits.append(f"自动摊牌胜率≈{profile.auto_showdown_win:.0f}%")
    if profile.auto_tags:
        bits.append("自动标签:" + "、".join(profile.auto_tags))
    if profile.auto_summary:
        bits.append("自动总结:" + profile.auto_summary)
    return bits


_ALLOWED_ACTIONS = {"fold", "check", "call", "bet", "raise", "all_in"}
_ALLOWED_CONFIDENCE = {"high", "medium", "low"}
_ACTION_ALIAS = {
    "all-in": "all_in",
    "allin": "all_in",
    "jam": "all_in",
}


def _strip_markdown_code_fence(text: str) -> str:
    t = text.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", t, re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()
    t = re.sub(r"^\s*```(?:json)?\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


def _extract_balanced_json_object(text: str) -> str | None:
    start = text.find("{")
    if start < 0:
        return None

    depth = 0
    in_string = False
    escaped = False
    for idx in range(start, len(text)):
        ch = text[idx]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:idx + 1]

    return None


def _try_load_json_object(candidate: str) -> dict | None:
    try:
        loaded = json.loads(candidate)
        return loaded if isinstance(loaded, dict) else None
    except Exception:
        pass

    compacted = re.sub(r",\s*([}\]])", r"\1", candidate)
    try:
        loaded = json.loads(compacted)
        return loaded if isinstance(loaded, dict) else None
    except Exception:
        return None


def _extract_string_field(text: str, key: str, next_keys: list[str]) -> str:
    next_group = "|".join(re.escape(k) for k in next_keys)
    pattern = (
        rf'"{re.escape(key)}"\s*:\s*"'
        rf'([\s\S]*?)'
        rf'(?=",\s*"(?:{next_group})"\s*:|\s*\}}|\Z)'
    )
    m = re.search(pattern, text, flags=re.IGNORECASE)
    if not m:
        return ""
    return m.group(1).replace('\\"', '"').strip().rstrip('"')


def _extract_number_field(text: str, key: str) -> float | None:
    m = re.search(
        rf'"{re.escape(key)}"\s*:\s*(null|[-+]?\d+(?:\.\d+)?)',
        text,
        flags=re.IGNORECASE,
    )
    if not m:
        return None
    token = m.group(1).lower()
    if token == "null":
        return None
    try:
        return float(token)
    except Exception:
        return None


def _parse_json_loosely(text: str) -> dict | None:
    action_match = re.search(
        r'"action"\s*:\s*"?(fold|check|call|bet|raise|all_in|all-in|allin|jam)',
        text,
        flags=re.IGNORECASE,
    )
    if not action_match:
        return None

    action = action_match.group(1).strip().lower().replace("-", "_")
    action = _ACTION_ALIAS.get(action, action)

    confidence_match = re.search(
        r'"confidence"\s*:\s*"?(high|medium|low)',
        text,
        flags=re.IGNORECASE,
    )
    data_confidence_match = re.search(
        r'"data_confidence"\s*:\s*"?(high|medium|low)',
        text,
        flags=re.IGNORECASE,
    )

    return {
        "action": action,
        "amount": _extract_number_field(text, "amount"),
        "confidence": (confidence_match.group(1).lower() if confidence_match else "low"),
        "data_confidence": (data_confidence_match.group(1).lower() if data_confidence_match else "low"),
        "reasoning": _extract_string_field(
            text,
            "reasoning",
            ["gto_note", "gto_baseline", "exploit_adjustment", "target_opponent", "confidence", "data_confidence"],
        ),
        "gto_note": _extract_string_field(
            text,
            "gto_note",
            ["gto_baseline", "exploit_adjustment", "target_opponent", "reasoning"],
        ),
        "gto_baseline": _extract_string_field(
            text,
            "gto_baseline",
            ["exploit_adjustment", "target_opponent", "reasoning", "gto_note"],
        ),
        "exploit_adjustment": _extract_string_field(
            text,
            "exploit_adjustment",
            ["target_opponent", "reasoning", "gto_note", "gto_baseline"],
        ),
        "target_opponent": _extract_string_field(
            text,
            "target_opponent",
            ["reasoning", "gto_note", "gto_baseline", "exploit_adjustment"],
        ),
    }


def _parse_model_advice(text: str) -> dict | None:
    cleaned = _strip_markdown_code_fence(text)

    for source in (cleaned, text):
        candidate = _extract_balanced_json_object(source)
        if candidate:
            loaded = _try_load_json_object(candidate)
            if loaded is not None:
                return loaded

    return _parse_json_loosely(cleaned)


def _normalize_advice_payload(data: dict) -> dict:
    action = str(data.get("action", "unknown")).strip().lower().replace("-", "_")
    action = _ACTION_ALIAS.get(action, action)
    if action not in _ALLOWED_ACTIONS:
        action = "unknown"

    confidence = str(data.get("confidence", "low")).strip().lower()
    if confidence not in _ALLOWED_CONFIDENCE:
        confidence = "low"

    data_confidence = str(data.get("data_confidence", "low")).strip().lower()
    if data_confidence not in _ALLOWED_CONFIDENCE:
        data_confidence = "low"

    amount = data.get("amount")
    try:
        amount = None if amount is None else float(amount)
    except Exception:
        amount = None

    return {
        "action": action,
        "amount": amount,
        "confidence": confidence,
        "data_confidence": data_confidence,
        "reasoning": str(data.get("reasoning", "")).strip(),
        "gto_note": str(data.get("gto_note", "")).strip(),
        "gto_baseline": str(data.get("gto_baseline", "")).strip(),
        "exploit_adjustment": str(data.get("exploit_adjustment", "")).strip(),
        "target_opponent": str(data.get("target_opponent", "")).strip(),
    }


def build_hand_context(hand: HandState, session: SessionState, profiles: dict[str, PlayerProfile]) -> str:
    lines: list[str] = []
    position_map = _position_map(hand, session)
    seat_map = {p.seat: p.name for p in session.players}
    dealer = seat_map.get(hand.dealer_seat, f"Seat {hand.dealer_seat}")
    hero_state = _hero_state(hand, session)

    lines.append(f"**Game:** {session.small_blind}/{session.big_blind} blinds, {len(hand.player_stacks)} players in hand")
    lines.append(f"**Dealer (BTN):** {dealer}")
    lines.append(f"**Street:** {hand.street.value.upper()}")
    lines.append(f"**My cards:** {fmt_cards(hand.my_cards)}")
    if hand.board:
        lines.append(f"**Board:** {fmt_cards(hand.board)}")
    lines.append(f"**Pot:** {_fmt_num(hand.pot)}")

    me = session.me or ""
    lines.append(f"**Hero:** {me} @ {position_map.get(me, 'Unknown')} | stack={_fmt_num(hero_state['hero_stack'])}")
    if hero_state["to_call"] > 0:
        lines.append(f"**To call:** {_fmt_num(hero_state['to_call'])}")
    if hero_state["pot_odds"] is not None:
        lines.append(f"**Pot odds (call):** {hero_state['pot_odds']}%")
    if hero_state["effective_vs_big"] is not None:
        lines.append(
            f"**Effective stack:** vs最大对手={_fmt_num(hero_state['effective_vs_big'])}, "
            f"vs最短对手={_fmt_num(hero_state['effective_vs_short'])}"
        )
    if hero_state["spr"] is not None:
        lines.append(f"**SPR (vs最大对手):** {hero_state['spr']}")

    stack_info = []
    seat_by_name = {p.name: p.seat for p in session.players}
    ordered_players = sorted(hand.player_stacks.keys(), key=lambda n: seat_by_name.get(n, 99))
    for name in ordered_players:
        stack = hand.player_stacks.get(name, 0)
        bet = hand.current_bets.get(name, 0)
        marker = " ← ME" if name == me else ""
        status = "in" if name in hand.active_players else "folded"
        pos = position_map.get(name, "Unknown")
        stack_info.append(
            f"  {name}({pos}, seat {seat_by_name.get(name, '?')}): "
            f"stack={_fmt_num(stack)}, bet_this_street={_fmt_num(bet)}, status={status}{marker}"
        )
    lines.append("**Stacks:**\n" + "\n".join(stack_info))

    action_line = _build_action_line(hand)
    if action_line:
        lines.append("**Action line:**\n" + action_line)

    if hand.actions:
        lines.append("**Action history (detailed):**")
        for a in hand.actions:
            amt = f" {_fmt_num(a.amount)}" if a.amount > 0 else ""
            lines.append(f"  [{a.street.value}] {a.player}: {a.action_type.value}{amt}")

    player_actions: dict[str, list[str]] = {}
    for a in hand.actions:
        if a.player == me:
            continue
        if a.player not in player_actions:
            player_actions[a.player] = []
        amt = _fmt_num(a.amount) if a.amount > 0 else ""
        player_actions[a.player].append(f"[{a.street.value}]{a.action_type.value}{amt}")

    opponent_profiles = []
    for name in ordered_players:
        if name == me:
            continue

        profile = profiles.get(name)
        parts: list[str] = []
        if profile:
            parts.extend(_manual_profile_bits(profile))
            parts.extend(_auto_profile_bits(profile))
        if name in player_actions:
            parts.append("本手行动:" + " ".join(player_actions[name]))

        folded = name not in hand.active_players
        status = "（已弃牌）" if folded else "（在场）"
        if parts:
            opponent_profiles.append(f"  **{name}**{status}: " + " | ".join(parts))
        else:
            opponent_profiles.append(f"  **{name}**{status}: 暂无画像")

    if opponent_profiles:
        lines.append("**Opponent profiles (manual + auto):**\n" + "\n".join(opponent_profiles))

    return "\n".join(lines)


def get_advice(hand: HandState, session: SessionState, profiles: dict[str, PlayerProfile]) -> dict:
    context = build_hand_context(hand, session, profiles)

    system = """你是一位专业的德州扑克教练，精通GTO与实战 exploit 调整。
你现在指导的是 1/2 盲注的 home game，默认 100BB 左右深度。
这是非标准、玩家倾向明显的私局环境：建议以 exploit（剥削）为主，GTO 作为基准参考。
这桌不是标准开池尺度：常规 open raise 大约是 15（约 7.5BB）。
在给 preflop 尺寸建议时，请以这个习惯尺度为基准，而不是默认 2-3BB 标准开池。

你会收到：
1) 场上信息（位置、SPR、pot odds、有效筹码）
2) 本手完整行动路线（action line）
3) 对手双层画像：
   - 手动画像（用户长期主观读牌）
   - 自动统计画像（系统根据真实手牌记录自动更新）

融合规则：
- 必须综合两层画像，不可忽略任意一层
- 当样本<20手，手动画像权重更高；样本>=20手，自动统计权重更高
- 如果两层画像冲突，在 reasoning 中明确点出冲突和你的取舍
- 决策优先级：先给出 GTO baseline，再给 exploit 调整；若剥削点明确，最终建议应优先可执行的剥削策略
- 避免过度理论化混合频率，给清晰直接的单一主建议（动作+尺寸）

输出要求：
- 先给行动和尺寸，再给2-3句中文理由
- reasoning 总长度控制在 120 字以内，避免冗长
- 指出 GTO 基准线与 exploit 偏离点
- 如有针对性偏离，明确针对哪位对手

只输出 JSON（不要 markdown，不要额外文本）：
{
  "action": "fold|check|call|bet|raise|all_in",
  "amount": <数字或null>,
  "confidence": "high|medium|low",
  "data_confidence": "high|medium|low",
  "reasoning": "<2-3句中文>",
  "gto_note": "<纯GTO一行说明，若与建议一致可留空>",
  "gto_baseline": "<本节点GTO基准简述>",
  "exploit_adjustment": "<针对画像的偏离点，若无留空字符串>",
  "target_opponent": "<被针对的对手名字，若无留空字符串>"
}"""

    user_msg = f"当前牌局情况：\n\n{context}\n\n请给出建议。"

    try:
        resp = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=700,
            temperature=0,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = resp.content[0].text.strip()
        parsed = _parse_model_advice(text)
        if parsed is None:
            return {
                "action": "unknown",
                "amount": None,
                "confidence": "low",
                "data_confidence": "low",
                "reasoning": "模型返回格式异常，请点击刷新重试。",
                "gto_note": "",
                "gto_baseline": "",
                "exploit_adjustment": "",
                "target_opponent": "",
            }

        return _normalize_advice_payload(parsed)
    except Exception as e:
        return {
            "action": "error",
            "amount": None,
            "confidence": "low",
            "data_confidence": "low",
            "reasoning": f"AI advisor error: {str(e)}",
            "gto_note": "",
            "gto_baseline": "",
            "exploit_adjustment": "",
            "target_opponent": "",
        }
