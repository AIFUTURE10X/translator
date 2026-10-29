# Translator

Thai/English voice and text translator with Thai learning packs (Vercel translator, branch master). OpenAI translation, Google TTS, streamed speech playback.

## AI OS link

Part of Phil's AI OS — registry slug: `translator` (project id 42).
- Status and next action live in the registry row, not in this file. On Phil's PC:
  `node C:/Projects/ai-os-system/scripts/db.mjs query "select status, next_action from projects where slug='translator'"`
  When the next action changes, update that row and set `last_activity_at = now()`.
- Work state (tasks, findings, decisions) goes to the ai-os Neon DB with `project_id = 42`; notable work
  to the journal: `node C:/Projects/ai-os-system/scripts/log.mjs "<entry>" --tags translator`.
- Durable learnings go in this file or the OS vault.
