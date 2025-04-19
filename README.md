# Vana

Vana is an agent-driven cloud platform for SEO-ready products. It can be prompted
from Lovable via UI
to activate agents like Sage, Rhea, Juno, Max, and more.

- Connected to Supabase (PGvector)
- Calls Gemini via Vertex AI
- Logs agent actions, memory, response
- Replays: /replay/:run_id
- Lovable UP interface all agent tasks

--\n
Test run:

```
python3 scripts/test_router.py
```

Spec payload: `scripts/ui_test_payload.json`

Detail: `signature_chart.md`
- Prompt route (genicked for agent)
- Sections: Context, Response, Memory, Raw