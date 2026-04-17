from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime
import uuid


def new_id():
    return str(uuid.uuid4())[:8]

def now_iso():
    return datetime.now().isoformat()


class Street(str, Enum):
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


class ActionType(str, Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"
    ALL_IN = "all_in"


class Action(BaseModel):
    player: str
    street: Street
    action_type: ActionType
    amount: float = 0
    timestamp: str = Field(default_factory=now_iso)


class Player(BaseModel):
    name: str
    seat: int  # 1-9
    chips: float = 200.0
    active: bool = True


class HandState(BaseModel):
    id: str = Field(default_factory=new_id)
    dealer_seat: int
    street: Street = Street.PREFLOP
    board: List[str] = []
    my_cards: List[str] = []
    pot: float = 0
    actions: List[Action] = []
    player_stacks: Dict[str, float] = {}
    current_bets: Dict[str, float] = {}
    active_players: List[str] = []
    needs_to_act: List[str] = []
    current_actor: Optional[str] = None
    bet_to_call: float = 0
    winners: List[str] = []
    status: str = "active"
    waiting_for_board: bool = False
    hand_number: int = 1


class SessionState(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    created_at: str = Field(default_factory=now_iso)
    small_blind: float = 1.0
    big_blind: float = 2.0
    players: List[Player] = []
    me: Optional[str] = None
    current_hand: Optional[HandState] = None
    hands_history: List[HandState] = []
    hand_count: int = 0
    last_dealer_seat: Optional[int] = None
    status: str = "active"


class PlayerProfile(BaseModel):
    name: str
    sessions_played: int = 0
    hands_played: int = 0
    notes: str = ""
    tags: List[str] = []
    vpip_estimate: Optional[float] = None
    pfr_estimate: Optional[float] = None
    aggression: str = ""
    tendencies: str = ""
    # Auto-updated stats from recorded hands
    vpip_opp: int = 0
    vpip_yes: int = 0
    pfr_opp: int = 0
    pfr_yes: int = 0
    three_bet_opp: int = 0
    three_bet_yes: int = 0
    postflop_bet_raise: int = 0
    postflop_call_check: int = 0
    showdown_seen: int = 0
    showdown_won: int = 0
    # Derived metrics and rule-based summary
    auto_vpip: Optional[float] = None
    auto_pfr: Optional[float] = None
    auto_three_bet: Optional[float] = None
    auto_aggression_factor: Optional[float] = None
    auto_showdown_win: Optional[float] = None
    auto_tags: List[str] = []
    auto_summary: str = ""
    last_updated: str = Field(default_factory=now_iso)


# Request/Response models
class CreateSessionRequest(BaseModel):
    name: str
    small_blind: float = 1.0
    big_blind: float = 2.0
    me: str
    my_seat: int = 1
    my_chips: float = 200.0


class AddPlayerRequest(BaseModel):
    name: str
    seat: int
    chips: float = 200.0


class StartHandRequest(BaseModel):
    dealer_seat: int
    my_cards: List[str]
    participants: List[str]


class RecordActionRequest(BaseModel):
    player: str
    action_type: ActionType
    amount: float = 0


class UpdateBoardRequest(BaseModel):
    cards: List[str]


class EndHandRequest(BaseModel):
    winners: List[str]
    winner_amounts: Dict[str, float] = {}


class UpdatePlayerProfileRequest(BaseModel):
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    vpip_estimate: Optional[float] = None
    pfr_estimate: Optional[float] = None
    aggression: Optional[str] = None
    tendencies: Optional[str] = None
