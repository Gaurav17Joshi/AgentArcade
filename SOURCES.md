# Asset and puzzle sources

## Jigsaw reference images

- File: `assets/cat.jpg`
- Source: [Unsplash image delivery URL](https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=85)
- File: `assets/dog.jpg` — [Golden retriever photograph, CC0](https://commons.wikimedia.org/wiki/File:Image_of_golden_retriever.jpg).
- File: `assets/mona-lisa.jpg` — [Mona Lisa by Leonardo da Vinci, public-domain reproduction](https://commons.wikimedia.org/wiki/File:Mona_Lisa.jpg).
- File: `assets/great-wave.jpg` — [The Great Wave off Kanagawa, public-domain reproduction](https://commons.wikimedia.org/wiki/File:Great_Wave_off_Kanagawa_restored.jpg).
- File: `assets/starry-night.jpg` — [The Starry Night by Vincent van Gogh, public-domain reproduction](https://commons.wikimedia.org/wiki/File:TheStarryNightByVincentVanGogh.jpg).

They are stored locally so Jigsaw works without third-party image requests and so the cursor runner can safely capture the complete visual board. The app sends the selected reference image to a visual-model provider only when the user explicitly starts a reference-enabled live run.

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
