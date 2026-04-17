from models import *
from typing import List, Optional


def _seats_in_order_after(all_seats: List[int], after_seat: int) -> List[int]:
    """Return seats in circular order starting AFTER after_seat."""
    s = sorted(all_seats)
    idx = None
    for i, seat in enumerate(s):
        if seat > after_seat:
            idx = i
            break
    if idx is None:
        return s  # wrap: all seats are <= after_seat
    return s[idx:] + s[:idx]


def _player_by_name(players: List[Player], name: str) -> Optional[Player]:
    return next((p for p in players if p.name == name), None)


def init_hand(session: SessionState, dealer_seat: int, my_cards: List[str], participants: List[str]) -> HandState:
    seat_map = {p.name: p.seat for p in session.players if p.name in participants}
    name_by_seat = {p.seat: p.name for p in session.players if p.name in participants}
    stacks = {p.name: p.chips for p in session.players if p.name in participants}

    active_seats = sorted(seat_map.values())
    ordered_seats = _seats_in_order_after(active_seats, dealer_seat)
    ordered_names = [name_by_seat[s] for s in ordered_seats if s in name_by_seat]

    if len(ordered_names) < 2:
        raise ValueError("Need at least 2 players")

    sb_player = ordered_names[0]
    bb_player = ordered_names[1]

    sb_amount = min(session.small_blind, stacks[sb_player])
    bb_amount = min(session.big_blind, stacks[bb_player])

    stacks[sb_player] -= sb_amount
    stacks[bb_player] -= bb_amount

    pot = sb_amount + bb_amount
    current_bets = {p: 0.0 for p in ordered_names}
    current_bets[sb_player] = sb_amount
    current_bets[bb_player] = bb_amount

    blind_actions = [
        Action(player=sb_player, street=Street.PREFLOP, action_type=ActionType.BET, amount=sb_amount),
        Action(player=bb_player, street=Street.PREFLOP, action_type=ActionType.BET, amount=bb_amount),
    ]

    # Preflop: action starts UTG (after BB), then wraps to SB, then BB
    if len(ordered_names) > 2:
        preflop_order = ordered_names[2:] + ordered_names[:2]
    else:
        # Heads up: SB (dealer) acts first preflop
        preflop_order = [sb_player, bb_player]

    needs_to_act = list(preflop_order)
    first_actor = needs_to_act[0]

    return HandState(
        dealer_seat=dealer_seat,
        street=Street.PREFLOP,
        board=[],
        my_cards=my_cards,
        pot=pot,
        actions=list(blind_actions),
        player_stacks=stacks,
        current_bets=current_bets,
        active_players=list(ordered_names),
        needs_to_act=needs_to_act,
        current_actor=first_actor,
        bet_to_call=bb_amount,
        hand_number=session.hand_count + 1,
    )


def apply_action(hand: HandState, player: str, action_type: ActionType, amount: float = 0) -> HandState:
    if player not in hand.active_players:
        raise ValueError(f"{player} is not active")

    # Deep copy via dict round-trip
    import json
    hand = HandState.model_validate(json.loads(hand.model_dump_json()))

    if action_type == ActionType.FOLD:
        hand.active_players.remove(player)
        hand.needs_to_act = [p for p in hand.needs_to_act if p != player]
        hand.actions.append(Action(player=player, street=hand.street, action_type=action_type))

    elif action_type == ActionType.CHECK:
        hand.needs_to_act = [p for p in hand.needs_to_act if p != player]
        hand.actions.append(Action(player=player, street=hand.street, action_type=action_type))

    elif action_type == ActionType.CALL:
        call_amt = max(0, hand.bet_to_call - hand.current_bets.get(player, 0))
        actual = min(call_amt, hand.player_stacks.get(player, 0))
        hand.player_stacks[player] = hand.player_stacks.get(player, 0) - actual
        hand.current_bets[player] = hand.current_bets.get(player, 0) + actual
        hand.pot += actual
        hand.needs_to_act = [p for p in hand.needs_to_act if p != player]
        hand.actions.append(Action(player=player, street=hand.street, action_type=action_type, amount=actual))

    elif action_type in (ActionType.BET, ActionType.RAISE):
        # amount = total bet this street (not additional)
        already_bet = hand.current_bets.get(player, 0)
        additional = max(0, amount - already_bet)
        additional = min(additional, hand.player_stacks.get(player, 0))
        hand.player_stacks[player] = hand.player_stacks.get(player, 0) - additional
        hand.current_bets[player] = already_bet + additional
        hand.pot += additional
        hand.bet_to_call = hand.current_bets[player]
        # Everyone else needs to act again
        hand.needs_to_act = [p for p in hand.active_players if p != player]
        hand.actions.append(Action(player=player, street=hand.street, action_type=action_type, amount=amount))

    elif action_type == ActionType.ALL_IN:
        remaining = hand.player_stacks.get(player, 0)
        hand.current_bets[player] = hand.current_bets.get(player, 0) + remaining
        hand.pot += remaining
        hand.player_stacks[player] = 0
        if hand.current_bets[player] > hand.bet_to_call:
            hand.bet_to_call = hand.current_bets[player]
            hand.needs_to_act = [p for p in hand.active_players if p != player]
        else:
            hand.needs_to_act = [p for p in hand.needs_to_act if p != player]
        hand.actions.append(Action(player=player, street=hand.street, action_type=action_type, amount=remaining))

    # Only one player left
    if len(hand.active_players) == 1:
        hand.status = "complete"
        hand.winners = list(hand.active_players)
        hand.current_actor = None
        hand.needs_to_act = []
        return hand

    # Advance actor
    if hand.needs_to_act:
        hand.current_actor = hand.needs_to_act[0]
    else:
        hand.current_actor = None
        _advance_street(hand)

    return hand


def _advance_street(hand: HandState) -> None:
    """Mutates hand in place to advance to next street."""
    next_map = {
        Street.PREFLOP: Street.FLOP,
        Street.FLOP: Street.TURN,
        Street.TURN: Street.RIVER,
        Street.RIVER: Street.SHOWDOWN,
    }

    if hand.street == Street.RIVER:
        hand.street = Street.SHOWDOWN
        hand.status = "complete"
        hand.current_actor = None
        return

    hand.street = next_map[hand.street]
    hand.current_bets = {p: 0.0 for p in hand.active_players}
    hand.bet_to_call = 0
    hand.needs_to_act = []
    hand.current_actor = None
    hand.waiting_for_board = True  # pause until board cards are entered


def set_board_cards(hand: HandState, cards: List[str]) -> HandState:
    import json
    hand = HandState.model_validate(json.loads(hand.model_dump_json()))
    hand.board = cards

    required = {Street.FLOP: 3, Street.TURN: 4, Street.RIVER: 5}
    needed = required.get(hand.street)

    if hand.waiting_for_board and needed and len(cards) == needed:
        hand.waiting_for_board = False
        hand.needs_to_act = list(hand.active_players)
        hand.current_actor = hand.active_players[0] if hand.active_players else None

    return hand


def end_hand(session: SessionState, winners: List[str], winner_amounts: dict) -> SessionState:
    import json
    session = SessionState.model_validate(json.loads(session.model_dump_json()))
    hand = session.current_hand
    if not hand:
        return session

    hand.winners = winners
    hand.status = "complete"

    # Sync final stacks from hand state, then add winnings
    for p in session.players:
        if p.name in hand.player_stacks:
            p.chips = hand.player_stacks[p.name]

    if winner_amounts:
        for name, amount in winner_amounts.items():
            for p in session.players:
                if p.name == name:
                    p.chips += amount
    else:
        share = hand.pot / len(winners) if winners else 0
        for name in winners:
            for p in session.players:
                if p.name == name:
                    p.chips += share

    session.hands_history.append(hand)
    session.current_hand = None
    session.hand_count += 1

    return session
