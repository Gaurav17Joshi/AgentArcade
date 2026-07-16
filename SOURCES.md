# Asset and puzzle sources

## Cat reference image

- File: `assets/cat.jpg`
- Source: [Unsplash image delivery URL](https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=85)
- Used locally only as the reference artwork for the Cat 9-piece and Cat 16-piece jigsaws. The app never uploads it anywhere except to the chosen visual-model provider when the user explicitly runs the reference-image agent.

## Sokoban levels

- `Microban 02`, `31`, `38`, and `47` are imported from the [Microban level text in Still Yet Another Sokoban](https://github.com/davidjoffe/sokoban/blob/main/data/sokoban/levels/microban.txt), with only board-safe exterior padding added where needed. The repository README describes its default 90-level collection as public domain.
- `Reference warehouse` is an original playable interpretation inspired by the supplied `Images/Sokoban1.png` sketch, not a claim of an exact transcription.

## Klotski levels

- `Beginner 2` and the three `Advanced` boards are playable long-block interpretations of the supplied `Images/klotski3.jpeg` through `Images/klotski6.jpeg`. They preserve the requested rule: a rectangular tile slides only along its longer axis; no rotations or diagonal moves are allowed.
- The numbered-tile convention and classic 4×5 Klotski family are documented by [Klotski.org](https://www.klotski.org/). Agent Arcade deliberately uses a 6×6 long-block variant to match the supplied reference boards and make each command legible as `1R`, `2U`, and so on.

## Maze levels

- The expert maze difficulty, dense dead-end style, and 20–30 cell rectangular target sizes are based on the freely available [Maze Printables expert collection](https://mazeprintables.com/). Agent Arcade transcribes compact grid versions so they remain keyboard- and agent-playable rather than embedding the source artwork.

## Model presets

- Anthropic preset IDs and displayed families are taken from Anthropic’s [model overview](https://platform.claude.com/docs/en/about-claude/models/overview). In particular, current Claude 4.6+ aliases use dateless IDs such as `claude-sonnet-5`.
- OpenAI preset IDs are taken from the official [OpenAI model documentation](https://developers.openai.com/api/docs/models), including `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.
