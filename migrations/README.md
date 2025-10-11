# Database Migrations

This directory contains SQL migration scripts for the Vana database schema.

## Running Migrations

### SQLite (Development)
```bash
sqlite3 auth.db < migrations/001_add_long_term_memory.sql
```

### PostgreSQL (Production)
```bash
psql $AUTH_DATABASE_URL -f migrations/001_add_long_term_memory.sql
```

### Using Python
```python
from app.auth.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    with open('migrations/001_add_long_term_memory.sql') as f:
        conn.execute(text(f.read()))
    conn.commit()
```

## Migration Files

- `001_add_long_term_memory.sql` - Adds long_term_memory table for AI agent personalization

## Note

These migrations are temporary until Alembic is properly configured. Once Alembic is set up, these should be converted to proper Alembic migration versions.
