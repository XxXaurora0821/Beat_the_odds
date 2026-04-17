# 家庭朋友德州娱乐小助手

本项目是一个本地运行的家庭朋友德州娱乐辅助工具，用于记录牌局、维护玩家画像，并在你行动时给出「GTO 基线 + 剥削调整」建议。

## 适用场景

- 家庭局 / 朋友局（home game）
- 非标准开池环境（默认按本桌常见 open 尺寸约 `15` 处理）
- 以娱乐和复盘为主，不用于任何线上平台实时作弊

## 核心功能

- 牌局管理：创建/结束 session，管理玩家、座位、筹码
- 牌桌可视化：9 人座位、底池、公共牌、当前行动人高亮
- 行动记录：按顺序记录 `fold/check/call/bet/raise/all_in`
- AI 建议：轮到你时自动分析并返回动作、尺寸、置信度和理由
- 双层画像：手动画像（标签/备注/倾向）+ 自动画像（VPIP/PFR/3bet/AF/摊牌）
- 本地持久化：session 与画像存储在本地 `data/` JSON 文件

## 快速开始

### 1. 安装依赖

后端（Python 3.10+）：

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

前端（Node 18+）：

```bash
cd frontend
npm install
```

### 2. 配置 API Key

在项目根目录创建 `.env`：

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### 3. 启动项目

方式一（推荐）：

```bash
./start.sh
```

方式二（分别启动）：

```bash
# backend
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# frontend
cd frontend
npm run dev
```

前端默认地址：`http://localhost:5173`

## 使用流程

1. 新建一局，填写局名和你的玩家名。
2. 添加所有参与玩家，设置座位和初始筹码。
3. 开始手牌：选择 BTN、参与者、你的底牌。
4. 按真实顺序记录动作，系统实时更新底池和行动权。
5. 轮到你时查看 AI 建议（会结合当前局面、行动线、手动画像和自动画像）。
6. 结束手牌后确认赢家，系统自动结算并更新长期画像统计。

## 项目结构

```text
Beat_the_odds/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── game_engine.py
│   ├── ai_advisor.py
│   └── storage.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
└── data/
    ├── sessions/
    └── players.json
```

## 默认参数

- 初始筹码：`200`
- 小盲 / 大盲：`1 / 2`
- 最大座位数：`9`
- AI 模型：`claude-sonnet-4-6`
