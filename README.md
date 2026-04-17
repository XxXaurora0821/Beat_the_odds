# Beat The Odds — 德州扑克小助手

本地运行的德州 Hold'em 辅助工具。记录牌局行动、追踪玩家画像，在你的回合自动给出 GTO + 对手针对性建议。

---

## 功能

- **Session 管理** — 创建牌局，玩家随时加入/离开，筹码实时同步
- **牌桌可视化** — 9座俯视图，显示位置、筹码、底池、公共牌
- **行动记录** — 点按钮记录每个玩家的 fold/check/call/bet/raise/all-in
- **AI 建议** — 轮到你时自动触发，基于 GTO + 对手读牌，给出行动建议和简短理由
- **玩家画像** — 短期记忆（本手行动线）+ 长期记忆（VPIP/PFR/打法风格/笔记），前端直接编辑
- **数据持久化** — 所有 session 和玩家数据存本地 JSON，跨局迭代

---

## 快速开始

### 1. 环境准备

**后端（Python 3.10+）**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**前端（Node 18+）**
```bash
cd frontend
npm install
```

### 2. 配置 API Key

编辑根目录 `.env`：
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### 3. 启动

**后端**（在 `backend/` 目录，虚拟环境激活状态）：
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**前端**（在 `frontend/` 目录）：
```bash
npm run dev
```

打开浏览器访问 `http://localhost:8000`

---

## 使用流程

### 开局
1. 首页点 **New Session**，填入 session 名称和你的名字
2. 点 **Players** → 为每位玩家选择座位号并填入初始筹码（默认 200）

### 每手牌
1. 点 **Deal Hand**，选择 BTN 位置、选择参与本手的玩家、输入你的底牌
2. 按桌上实际行动顺序，点每个玩家对应的行动按钮
3. **轮到你时 AI 建议自动弹出**，显示推荐行动、理由和置信度
4. 每条街结束后，通过 Board Cards 选择器输入公共牌
5. 手牌结束点 **End Hand**，选择赢家，筹码自动结算

### 玩家画像
- 右侧 **Player Profiles** 面板可随时展开编辑任意玩家的 VPIP/PFR/风格标签/读牌笔记
- 数据实时保存，下次 session 中对应玩家的历史画像会自动带入 AI 分析上下文

---

## 项目结构

```
Beat_the_odds/
├── .env                      # API Key（不要提交到 git）
├── backend/
│   ├── requirements.txt
│   ├── main.py               # FastAPI 路由
│   ├── models.py             # 数据模型（Pydantic）
│   ├── game_engine.py        # 游戏状态机：行动顺序、下注逻辑
│   ├── ai_advisor.py         # Claude API 调用与 prompt 构建
│   └── storage.py            # JSON 文件读写
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx           # 主界面
│       ├── api.js            # 前端 API 封装
│       └── components/
│           ├── PokerTable.jsx     # 牌桌俯视图
│           ├── CardPicker.jsx     # 牌面选择器
│           ├── ActionPanel.jsx    # 行动记录
│           ├── AdvisorPanel.jsx   # AI 建议面板
│           └── PlayerMemory.jsx   # 玩家画像编辑
└── data/                     # 自动生成，存储所有本地数据
    ├── sessions/             # 每局 session JSON
    └── players.json          # 玩家长期画像
```

---

## 默认参数

| 参数 | 默认值 |
|------|--------|
| 初始筹码 | 200 |
| 小盲 | 1 |
| 大盲 | 2 |
| 最大座位数 | 9 |
| AI 模型 | claude-sonnet-4-6 |
