# praya-builder

> **Status: WIP / On Hold.** MVP pipeline works for small structures (~1000 blocks), but current LLM output quality and token limits make this impractical for production-scale buildings. The slice-based generation approach (generating single floor plans and stacking programmatically) shows promise but needs better model spatial reasoning to be viable. Revisit when models improve.

AI-powered building generator for Minecraft Java (Paper). Translates natural language descriptions into in-game structures via the Gemini API and WorldEdit.

## Pipeline
1. `/pbuilder generate "building description"` — player command
2. Gemini generates a 3D block grid as structured JSON
3. Plugin parses response into blocks, places via WorldEdit or saves as `.schem`

## Limitations
- Structures over ~1000 blocks risk hitting Gemini's output token ceiling (truncated JSON)
- Generation time scales with block count (30s–120s for small-to-medium structures)
- 3D spatial reasoning quality degrades with complexity — simple geometric forms work best

## Tools
`tools/preview.py` — standalone Python script to call Gemini and render a 3D voxel preview without a Minecraft server. See `tools/requirements.txt` for deps.

## Tech
- Java 21, Paper 1.21.1, WorldEdit 7.x/FAWE
- Gemini API (gemini-2.5-flash)
- Gradle with Kotlin DSL
