# Agent Arcade — Product and Technical Design Report

**Status:** design proposal for review before implementation  
**Project type:** web application / AI-agent playground  
**Primary audience:** hackathon judges, builders, students, and people curious about how AI agents plan and act

---

## 1. Project in one sentence

**Agent Arcade is a web-based workspace where an AI agent solves interactive logic and visual puzzles, can create its own subagent workspaces to explore ideas, and lets the user watch every agent's actions, progress, and results.**

It is not simply a collection of puzzles and it is not merely a chat interface for models. It is a visible environment for running and understanding agentic problem solving.

---

## 2. The problem and the opportunity

AI models can solve puzzles, make plans, call tools, and increasingly interact with computer interfaces. However, most of that work is opaque: a user gets a final answer without seeing how the agent explored options, recovered from mistakes, delegated work, or used a computer interface.

Existing evaluation systems tend to be research-oriented and technical. Agent Arcade makes this experience visual and interactive:

- Pick a challenge.
- Configure an agent.
- Watch it inspect and act on the puzzle.
- See it create subagents when it needs additional perspectives or parallel exploration.
- Switch into each agent's own workspace to inspect what it tried.
- Compare the final outcome, move count, duration, and cost.

The puzzles are controlled environments, which makes agent behavior measurable and replayable. They represent real computer-use skills: planning, state tracking, visual interpretation, mouse precision, tool use, recovery, and delegation.

---

## 3. What we are building

The initial product is a hosted website that users can open with a URL. It has four integrated parts.

### 3.1 Puzzle arcade

The arcade contains interactive puzzle environments. A user starts a run by selecting a puzzle and level.

Initial puzzle sequence:

1. **Sokoban** — structured grid planning, crates, goals, deadlocks, and long-horizon actions.
2. **Maze / grid navigation** — a simpler structured planning environment.
3. **Klotski** — a sliding-block planning puzzle; initially structured, with a visual version later.
4. **Jigsaw** — a visual, mouse-driven puzzle based on screenshots, clicking, and dragging.

The first release should make Sokoban excellent. Maze is a low-risk second environment that validates the general interface. Visual puzzles come after the core runtime is reliable, rather than being cut from the product vision.

### 3.2 Agent workspace

Every main agent run has an application workspace. It includes:

- The authoritative puzzle board.
- A visible virtual cursor or action animation.
- The current state: running, waiting, solved, failed, stopped, or budget-exhausted.
- Model, API key, and harness configuration.
- A readable public activity trace.
- Step count, action limit, latency, token/cost estimate, and result.

The main workspace is the real puzzle run. Its state is the only state that determines whether the puzzle is solved.

### 3.3 Subagent workspaces

The main agent may decide to create subagents. These are not restricted to a single fixed collaboration pattern. A main agent may:

- Ask three subagents to attempt three different solution strategies.
- Ask a planner for a high-level plan while it continues acting.
- Ask a visual analyst to identify likely jigsaw-piece placements.
- Ask a risk tester to try a potentially destructive sequence in a private copy of the board.
- Keep an agent running for longer, check its progress later, ask a follow-up question, or stop it.

Every subagent gets an isolated workspace based on a snapshot of the main puzzle's state at the time it was created. A subagent can explore its own copy without changing the real puzzle. It returns a report, suggested actions, screenshots, and/or a candidate plan to its parent.

This is closer to a lightweight agent operating system than a static multi-agent demo: the parent chooses when and why to delegate.

### 3.4 Evaluation and replay

Each run produces a durable result record (stored locally at first):

- Puzzle and level.
- Model/harness configuration (without storing API keys).
- Final outcome.
- Total actions, time, and estimated cost.
- Main-agent action timeline.
- Agent tree and child-agent summaries.
- Replayable board states/screenshots.

This enables later model comparisons and supports the project’s educational and benchmark aspects.

---

## 4. Core product concept: one puzzle, many workspaces

The central interaction needs to be explicit.

There is **one authoritative main puzzle**. At any time, the main agent may create zero or more separate subagent workspaces. Those workspaces are isolated copies of the puzzle state, not additional live puzzles for the user to manage.

```text
Main Agent Workspace (authoritative puzzle state, version 14)
|
|-- Planner (snapshot v14): maps a route and returns a plan
|-- Risk Tester (snapshot v14): tests a sequence; finds a deadlock
|-- Alternative Solver (snapshot v14): continues a different strategy
`-- Visual Analyst (snapshot v14): identifies likely piece placement
```

The main agent can continue working while children run, or wait for them. When it receives a report, it can use the information, request more work, or ignore it. It can apply a proposed action sequence only after validating that the main board is still compatible with the snapshot from which the proposal was made.

This design avoids agents corrupting each other’s work while preserving genuine parallel exploration.

### Example: Sokoban

1. The main agent reaches a board state where either crate might need to move first.
2. It spawns three subagents from the current board snapshot.
3. One tests the left-crate strategy, one tests the right-crate strategy, and one looks for deadlocks.
4. The main agent keeps observing the real board or pauses for reports.
5. A child returns: “left crate deadlocks after six moves; right crate leads to a 19-move route.”
6. The main agent validates the proposed route against its current board state and executes it on the authoritative board.

### Example: Jigsaw

1. The main agent sees an incomplete jigsaw.
2. It asks one child to look for edge/corner pieces, another to test the blue piece, and a third to identify likely target regions.
3. Each child receives the same board snapshot and manipulates only its private copy with a virtual cursor.
4. A child reports that a particular drag snapped a piece into place and supplies a before/after screenshot and proposed drag coordinates.
5. The main agent can reproduce that drag in its own workspace or use the report as evidence for another move.

---

## 5. Puzzle harnesses

Agent Arcade intentionally supports different ways for agents to perceive and act. The visible experience is unified, but the underlying interfaces are appropriate to each puzzle type.

### 5.1 Structured logic harness

Used initially for Sokoban, maze, and structured Klotski.

The model receives a compact, text-friendly observation rather than needing to infer a grid from pixels. For example:

```text
Board: 8 x 8
Walls: (0,0), (1,0), ...
Goals: (2,5), (6,6)
Crates: (3,4), (5,6)
Player: (2,4)
Available actions: UP, DOWN, LEFT, RIGHT
```

The model emits a small validated action, such as `UP`. The environment validates it, updates the canonical board state, and visually animates the move. The user still sees an agent playing a puzzle, but the model is not handicapped by unnecessary visual parsing.

Benefits:

- Deterministic and easy to score.
- Simple action validation.
- Easier debugging and replay.
- A fairer foundation for comparing planning ability.

### 5.2 Visual mouse harness

Used for jigsaw and later visual variants of Klotski or UI interaction tasks.

The model receives an image/screenshot of the board plus a concise task description. It does **not** receive semantic piece identities, valid target locations, a list of legal moves, or a hidden solved-board representation. It must interpret the visual state and choose raw mouse actions such as:

```text
move(x, y)
click(x, y)
drag(fromX, fromY, toX, toY, duration)
release()
```

The puzzle environment validates only the *shape and safety* of an action (for example, that coordinates are on the board and the action is well formed) and then produces the next rendered state. It must not turn an invalid placement into a hint, reveal whether a target is correct before the attempt, or otherwise make the puzzle easier for the model. The app overlays an animated **virtual cursor** so the user sees exactly where the agent moved and dragged.

The virtual cursor is part of the web application. It is not the user’s operating-system mouse and does not control their computer. This is what makes simultaneous, isolated agent workspaces safe and feasible.

### 5.3 Hybrid harness (future)

Some puzzles can be tested in both modes. For example, Klotski could offer:

- A structured-state run: the agent gets block coordinates and valid moves.
- A vision run: the agent gets only screenshots and must click/drag blocks.

This offers a compelling way to compare an agent’s planning with its visual computer-use ability.

---

## 6. Workspace and interface design

The application should feel like an agent workspace, not a standard chat page.

### 6.1 Main layout

```text
+-------------------------------------------------------------------+
| Agent Arcade   [ Main Agent v ] [ + Spawn agent ] [Run] [Stop]    |
+-------------------------------------------+-----------------------+
|                                           | Agent Control Center  |
|  Authoritative puzzle board               | --------------------  |
|  - board/canvas                           | Model: [select]       |
|  - virtual cursor / move animation        | API key: [masked]     |
|  - current move state                     | Harness: [logic]      |
|                                           | Budget: [settings]    |
|                                           |                       |
|                                           | Status: working       |
|                                           | Activity: “Testing…”  |
+-------------------------------------------+-----------------------+
| Action timeline and puzzle events                                 |
+-------------------------------------------------------------------+
```

### 6.2 Agent switcher

The top-left agent selector is the main way to navigate workspaces. It opens the agent tree:

```text
Main Agent                         working · step 14
  ├─ Planner                       reported
  ├─ Alternative Solver            working
  │   └─ Route Checker             working
  └─ Visual Analyst                reported

+ Spawn subagent
```

Selecting an entry switches the center board and right-hand inspector to that agent’s private workspace. The selected child’s workspace can show its frozen starting state, its current private board state, its own cursor, and its trace.

The primary MVP should show one workspace at a time. A later comparison view can tile two or more workspaces for side-by-side observation. We should not use actual browser pop-up windows: app-managed workspaces are more reliable, shareable, and controllable.

### 6.3 Agent Control Center

The persistent right panel configures and inspects whichever workspace is selected:

- Agent name and role.
- Parent agent, if any.
- Model/provider selection.
- User-provided API key (masked and not persisted).
- Harness type.
- Current status and elapsed time.
- Action/token/cost budgets.
- Public activity trace.
- Messages/reports sent to the parent.
- Start, pause, stop, or message controls.

### 6.4 Human-readable trace

The UI will not claim to show hidden model reasoning. Instead it shows a structured, user-facing agent trace that the agent intentionally returns:

```text
Status: Checking whether the upper passage is blocked.
Observation: The top crate cannot move right without trapping the player.
Plan: Try the lower-crate route in a private workspace.
Action: Spawned “Lower Route Tester.”
```

This lets users understand the run while keeping behavior compatible with model-provider policies and APIs.

---

## 7. Agent runtime design

### 7.1 Agent loop

Every agent follows the same high-level loop:

```text
observe environment
→ choose: act, spawn child, message child, wait, or stop
→ validate tool call
→ update workspace state
→ render event to the UI
→ repeat until solved, failed, stopped, or budget exhausted
```

The main agent and subagents use the same runtime. Their difference is authority:

- The main agent controls the authoritative environment.
- A subagent controls only its own cloned environment.

### 7.2 Agent tools

The model receives a controlled tool set. The exact schema can evolve, but the initial set is:

```text
get_observation()
apply_action(action)
spawn_agent(task, strategy, model?, budget?)
check_agent(agent_id)
message_agent(agent_id, message)
stop_agent(agent_id)
wait_for_report(agent_id | all)
finish(reason)
```

For a structured puzzle, `apply_action` accepts a direction. For a visual puzzle it accepts virtual mouse actions. Subagents will receive a compatible but isolated environment instance.

### 7.3 Snapshot and versioning system

Each puzzle state has a version number and a serializable snapshot.

```text
Main state version 14
→ child is created with snapshot version 14
→ child explores and returns an action proposal based on version 14
→ main is now at version 18
→ proposal is marked stale and must be revalidated before use
```

This is essential for correctness. A child’s insights can still be useful after the main changes state, but its exact actions cannot be blindly replayed.

### 7.4 Scheduling and budgets

Subagents should be concurrent where the browser/server and API limits permit it. The runtime should also enforce limits to prevent runaway expense or endless delegation:

- Maximum active children per agent.
- Maximum nesting depth.
- Per-agent model-call/token budget.
- Per-agent action limit.
- Optional total run cost budget.
- Timeout/cancellation support.

These limits are a product feature, not just a safeguard: users can compare the effectiveness of one agent versus an agent team under the same budget.

### 7.5 Agent computer workspaces

The long-term Agent Arcade agent should be more capable than a narrow “choose an arrow key” controller. Each agent can receive its own **sandboxed computer workspace** in addition to its puzzle workspace. In that private workspace it can:

- Create notes, plans, diagrams, and small solver scripts.
- Read and edit files that belong to its workspace.
- Run shell commands and use local utilities.
- Save reusable artifacts, including puzzle-solving playbooks/skills.
- Inspect its own generated images or reports.
- Resume work later from a saved sandbox snapshot.

For example, a Sokoban agent might write down a board encoding, implement a small deadlock checker, save a `sokoban-planning` skill for later runs, and then return a proposed move sequence. A visual agent might save annotated screenshots and an experiment log while it tests jigsaw hypotheses.

This is intentionally an **agent-owned computer**, not the user's computer and not the Agent Arcade production server. It must run in a separate sandbox/session with its own filesystem, process boundary, resource limits, and network policy. The agent is free *within that workspace*, but it must not be able to read server secrets, inspect other users’ data, control the visitor’s operating-system mouse, or execute unrestricted commands on the host.

The OpenAI Agents SDK Sandbox Agents feature is designed for this model: it provides per-agent workspaces with filesystem, shell, skills, memory, and snapshot support. It is currently documented as beta, so we will isolate it behind our own workspace adapter and avoid coupling the product to unstable SDK details. [Sandbox Agents concepts](https://openai.github.io/openai-agents-js/guides/sandbox-agents/concepts/)

---

## 8. Visual cursor and mouse-puzzle implementation

Mouse-driven puzzles are fully compatible with subagent workspaces because all interaction is simulated inside our application.

### Action pipeline

```text
Model emits a structured mouse action
→ server/runtime validates coordinates and action shape
→ selected workspace queues the action
→ its virtual cursor animates on that workspace’s puzzle canvas
→ puzzle receives the pointer/drag event
→ environment updates its private state
→ next screenshot and event are recorded
```

There is one virtual cursor per workspace. Three subagents can drag different pieces in their separate board copies at the same time. They never touch the user’s real cursor and never interfere with the main board.

### Coordinate system

Visual actions should use board-relative coordinates rather than browser-window pixels. This is an implementation detail for responsive rendering, **not additional puzzle information**: the agent still chooses the coordinates from the screenshot alone. For example, a 600 × 600 logical board can be displayed at any CSS size while an action remains stable:

```json
{ "type": "drag", "from": { "x": 120, "y": 240 }, "to": { "x": 405, "y": 104 } }
```

The environment converts these to rendered pixels. It will reject actions that are outside the board or violate the puzzle’s rules.

### Jigsaw-specific notes

Jigsaw is intentionally a later milestone because it needs:

- Piece geometry and hit testing.
- Drag behavior and snapping logic.
- Board-state serialization for cloning.
- Screenshot rendering.
- Clear success conditions.

It is still an appropriate goal. The first version can use a small, visually meaningful puzzle to keep engineering time bounded, but it should not disclose the snap grid or target coordinates to the agent. Increasing piece count, irregular shapes, rotation, and more subtle visual cues can follow after the core mouse harness is proved.

---

## 9. Model and API-key approach

Agent Arcade will be bring-your-own-key (BYOK) for real model runs. This keeps hosting costs out of the project and lets users choose their model.

### Proposed first implementation

- OpenAI support first.
- The user pastes an API key into the Agent Control Center.
- The key is kept only for the active browser session and never written to the database, local storage, run history, or logs.
- The server relays requests to the model provider; the browser should not directly expose a general-purpose provider integration.
- The UI shows that model usage is billed to the user’s own API account.

The app should also include static replays/sample traces so a visitor can understand the product without entering a key. These are not hosted live model runs.

Later, provider adapters can support more model APIs without changing puzzle or workspace logic.

---

## 10. Proposed technical architecture

The specific libraries can be adjusted, but this is a practical web-first design.

```text
Browser (Next.js / React + TypeScript)
|
|-- Arcade UI
|   |-- puzzle renderer and virtual cursor
|   |-- workspace/agent-tree switcher
|   |-- trace, replay, settings, run history
|
|-- Application API / agent runtime
|   |-- model-provider adapter
|   |-- tool-call validation and scheduling
|   |-- agent tree, messages, budgets, snapshots
|   `-- streaming events to the browser
|
`-- Puzzle environment package
    |-- common environment interface
    |-- Sokoban implementation
    |-- Maze implementation
    |-- future Klotski and Jigsaw implementations
    `-- serializers, scoring, action validators
```

### Agent orchestration foundation

The implementation will use the **OpenAI Agents SDK for TypeScript** as the foundation for model execution: agent loops, typed function tools, streaming lifecycle events, and development tracing. It is well suited to the project because it supports tool use and multi-agent composition. [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) documents these primitives, including agents-as-tools/handoffs and tracing.

Agent Arcade will add a custom orchestration layer on top of the SDK. This is necessary because its core interaction is more specific than a standard handoff: the main agent remains the authoritative puzzle owner while independently scheduled children receive cloned environments, continue in the background, and return reports later. The custom layer owns:

- Puzzle snapshots, cloning, and state-version checks.
- Workspace and agent-tree lifecycle.
- Independent child-agent budgets and cancellation.
- Background scheduling and event delivery to the UI.
- Virtual cursor animation and replay.
- The `spawn_agent`, `check_agent`, `message_agent`, and `stop_agent` tools exposed to the main agent.

In other words: **we will not reimplement model tool-calling and agent loops from scratch, but we will build the Agent Arcade-specific workspace runtime ourselves.**

### Model-provider independence

The app must not be locked to one LLM. The Agents SDK’s `Model` and `ModelProvider` interfaces allow a concrete model/provider implementation to be supplied per agent or per run; its official documentation also describes an adapter path through Vercel AI SDK for wider provider coverage. [Models guide](https://openai.github.io/openai-agents-js/guides/models/)

Agent Arcade will therefore use a provider-neutral registry:

```text
Agent configuration
  → selected provider adapter + user’s session-only key
  → selected model
  → common Agent Arcade tool schema
  → common workspace/event runtime
```

OpenAI will be the first tested adapter, but the puzzle environments and orchestration layer will not depend on an OpenAI-specific model name. A provider can be added when it supports the capabilities needed by the chosen puzzle:

- **Logic puzzles:** reliable structured tool/function calls are required.
- **Visual puzzles:** image input plus reliable structured mouse actions are required.
- **Agent-computer workspaces:** tool calls for shell/filesystem access are required.

Models that lack one of these features can still be offered for simpler text-only tasks, but should not be represented as equivalent computer-use agents.

For provider-neutral visual control, Agent Arcade will expose its own strict function tools such as `observe_board`, `move_mouse`, `click`, and `drag`. We can additionally use the SDK’s OpenAI-specific `computerTool()` path for compatible OpenAI models, but it will be an optimization, not the sole product interface. The SDK’s computer tool itself requires our application to provide the `Computer` implementation; our virtual puzzle workspace is that implementation. [Tools guide](https://openai.github.io/openai-agents-js/guides/tools/)

### Common environment interface

Every puzzle implements the same core contract:

```ts
interface PuzzleEnvironment<Action, Observation, Snapshot> {
  observe(): Observation;
  applyAction(action: Action): ActionResult;
  clone(): PuzzleEnvironment<Action, Observation, Snapshot>;
  serialize(): Snapshot;
  isComplete(): boolean;
  getMetrics(): PuzzleMetrics;
}
```

The agent runtime does not need to know whether it is controlling Sokoban or a jigsaw. It asks the current environment for observations, submits typed actions, and stores snapshots/events.

### Streaming events

The browser should receive live events so the experience feels active:

```text
agent_created
agent_status_changed
observation_received
public_trace_added
action_queued
action_applied
workspace_snapshot_updated
agent_reported
agent_finished
```

Server-sent events or a WebSocket can support this. Server-sent events are a straightforward initial choice because the client primarily consumes a streamed run timeline.

---

## 11. Data model (initial)

```text
Run
  id, puzzle type, level, started/ended timestamps, result, metrics

AgentWorkspace
  id, run id, parent id, name, role, status, model configuration,
  harness, starting snapshot version, current snapshot, budget, metrics

AgentEvent
  id, workspace id, sequence, timestamp, type, public payload

AgentReport
  id, source workspace id, target workspace id, summary,
  proposed actions, source state version, attachments
```

API keys are intentionally absent from this model.

For the first version, runs and events may live only in memory during a session, with optional browser-local replay storage. A database and authentication are not required to demonstrate the core product.

---

## 12. Evaluation and comparison

Agent Arcade can support both free-form exploration and fair model comparison.

### Exploration mode

Users choose their own models, budgets, subagent strategy, and puzzle. The point is to observe agent behavior.

### Benchmark mode

The app locks a comparable configuration:

- Same puzzle seed/level and starting snapshot.
- Same harness and action limit.
- Same agent/subagent budget.
- Same task prompt and stopping condition.
- Recorded model settings and usage metrics.

Metrics include success, moves, elapsed time, total agent calls, total estimated cost, and number/depth of delegated agents. A comparison should be honest about differing model settings and API pricing.

---

## 13. Implementation milestones

### Milestone 1 — Working Sokoban arcade

- Create the web app shell and polished Agent Arcade visual identity.
- Implement Sokoban board, levels, state updates, scoring, and animation.
- Implement structured observation and validated directional actions.
- Add one main-agent workspace and an action timeline.
- Add OpenAI BYOK agent execution.
- Add public trace/status events.

**Definition of success:** a user can paste a key, select a Sokoban level, watch an agent make moves, and see solved/failed metrics.

### Milestone 2 — Agent workspace tree and subagents

- Add serializable puzzle snapshots and cloning.
- Add `spawn_agent`, reports, messages, cancellation, and budgets.
- Add the top-left workspace switcher and child-workspace inspection.
- Enable the main agent to create multiple strategy/exploration agents.
- Add state-versioning and proposed-action validation.

**Definition of success:** while solving one Sokoban board, the main agent can create three isolated solver workspaces, inspect their paths, and use a report to continue the authoritative run.

### Milestone 3 — Replay, history, and comparison

- Persist event timeline and snapshots for the active session.
- Add replay controls and result summary.
- Add duplicate-run / compare configuration.
- Add pre-recorded sample run(s) for visitors without API keys.

**Definition of success:** a completed run can be replayed and compared with another run from the same start state.

### Milestone 4 — Maze and Klotski

- Add a maze environment to confirm the generic puzzle interface.
- Add structured Klotski.
- Improve benchmark cards, level picker, and leaderboard-like results display.

### Milestone 5 — Visual mouse harness and constrained jigsaw

- Implement screenshot observation and virtual mouse action schema.
- Add one visual drag/click test environment first.
- Implement constrained jigsaw: small rectangular pieces, fixed orientation, snap targets.
- Support child workspaces with independent cursors and board copies.

**Definition of success:** an agent and its children can inspect and manipulate cloned visual boards using visible virtual cursors, while the main workspace remains authoritative.

---

## 14. Deliberate non-goals for the first release

These are compatible with the long-term vision, but should not block the website MVP:

- Controlling arbitrary third-party websites such as Google Slides.
- A Chrome extension.
- Operating-system-level mouse control.
- Accounts, billing, or a public persistent leaderboard.
- Full reinforcement-learning training pipeline.
- Unbounded recursive agents.
- A complex, photo-realistic, rotating jigsaw.

The architecture deliberately leaves room for a future browser-extension environment. In that environment, the same runtime could use screenshots/accessibility state as observations and click/type/scroll as actions. The Agent Arcade web environments prove and refine the agent interface first.

---

## 15. Major risks and how we handle them

| Risk | Design response |
| --- | --- |
| Agent calls are slow or expensive | BYOK, visible budgets, action limits, cancellation, recorded demos |
| Subagent creation explodes in cost | maximum children/depth, per-agent budget, total-run budget |
| Agents interfere with each other | isolated cloned environments; only main workspace is authoritative |
| Child proposal becomes outdated | snapshot/version IDs and revalidation before replay |
| Visual actions are imprecise | board-relative coordinates, action validation, virtual cursor, constrained first jigsaw |
| Users cannot understand model activity | structured public trace, live action timeline, agent tree, replays |
| Model APIs differ | adapter layer around model calls and a stable internal tool schema |

---

## 16. Decisions to confirm before implementation

The following are the main product decisions to review and comment on:

1. Is the initial puzzle order correct: Sokoban → maze → structured Klotski → constrained jigsaw?
2. Should OpenAI be the only live provider in the hackathon version, with a provider adapter ready for later expansion?
3. Should subagents be available to the model automatically through a tool, with configurable hard limits on their count/depth/cost?
4. Should users be able to manually spawn/configure a child agent too, or only observe model-created agents in the first version?
5. Should the initial interface use one selected workspace at a time, with a future tiled comparison view?
6. Should run history be browser-local only for the initial hackathon release?
7. What level of user-facing model trace feels right: short status/reason/plan messages only, or an expanded developer event log as well?

---

## 17. Final framing

**Agent Arcade is a visual workspace for agents that think, act, delegate, and learn from controlled interactive challenges.**

The product’s distinctive feature is not just that an AI can solve Sokoban or drag a jigsaw piece. It is that people can see a main agent create a temporary team of independent workspaces, explore competing ideas, and decide what to do next—while every mouse movement, action, report, and outcome remains inspectable.
