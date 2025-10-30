# Update MCP Configuration for Simplified Setup

Since we're removing the vana-dev environment and using only the lovable cloud Supabase instance, you need to update your MCP configuration.

## Steps to Update

1. **Remove the old vana-dev MCP configuration:**
```bash
claude mcp remove supabase
```

2. **Add the lovable cloud MCP configuration:**
```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=xfwlneedhqealtktaacv&features=docs%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage%2Caccount"
```

3. **Restart VS Code** to apply the new MCP configuration.

## What Changed?

- **Before:** MCP connected to vana-dev (vznhbocnuykdmjvujaka)
- **After:** MCP connects to lovable cloud (xfwlneedhqealtktaacv)

## Benefits

✅ Single environment to manage
✅ No synchronization issues
✅ Simpler development workflow
✅ Direct access to production data for testing
✅ Same environment for local dev and lovable deployments

## Verification

After updating, you can verify the MCP connection by using any Supabase MCP command:
```
mcp__supabase__list_tables
```

This should show your tables from the lovable cloud instance.