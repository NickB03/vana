# Troubleshooting Knowledge Graph & MCP Issues

[Home](../../index.md) > [Troubleshooting](index.md) > Knowledge Graph & MCP Issues

This document provides guidance for troubleshooting common problems encountered when working with VANA's Knowledge Graph (KG) integration, which uses an MCP (Model Context Protocol) server.

## Common Issue Categories

### 1. Connection Issues

*   **Symptom:** Errors indicating inability to connect to the MCP server (e.g., connection refused, timeout, DNS resolution failure).
*   **Potential Causes & Solutions:**
    *   Verify `MCP_ENDPOINT` in your `.env` file is correct and the server is accessible from your VANA environment.
    *   Check network connectivity to the MCP server.
    *   Ensure the MCP server is running.
    *   Check for firewall rules blocking access.
    *   *[Further details to be added based on common issues encountered.]*

### 2. Authentication Errors

*   **Symptom:** Errors related to API key validation or unauthorized access (e.g., 401 Unauthorized, 403 Forbidden).
*   **Potential Causes & Solutions:**
    *   Verify `MCP_API_KEY` in your `.env` file is correct for the target MCP server and namespace.
    *   Ensure the API key has the necessary permissions on the MCP server.
    *   *[Further details to be added based on common issues encountered.]*

### 3. Data Discrepancies or Errors

*   **Symptom:** Entities or relationships not appearing as expected, incorrect data retrieved, errors during add/update/delete operations.
*   **Potential Causes & Solutions:**
    *   Verify `MCP_NAMESPACE` in your `.env` file to ensure you're working in the correct data scope.
    *   Check for typos in entity names or relationship types.
    *   Ensure data conforms to any expected schema or structure by `KnowledgeGraphManager`.
    *   Review MCP server logs if accessible.
    *   *[Further details to be added based on common issues encountered.]*

### 4. Query Problems

*   **Symptom:** KG queries via `KnowledgeGraphManager` return empty results, unexpected results, or errors.
*   **Potential Causes & Solutions:**
    *   Ensure the query syntax or parameters are correct for the methods used in `KnowledgeGraphManager`.
    *   The data might not exist in the KG as expected.
    *   The MCP server's search/query capabilities might have limitations.
    *   *[Further details to be added based on common issues encountered.]*

## General Troubleshooting Steps

1.  **Consult VANA Logs:** Check VANA's application logs for detailed error messages from `KnowledgeGraphManager` or its underlying `MCPClient`. See [Interpreting VANA Logs Guide](../guides/interpreting-logs.md).
2.  **Verify Configuration:** Double-check all MCP-related settings in your `.env` file.
3.  **Test Basic Connectivity:** Use tools like `curl` to test basic reachability and authentication with the MCP server's API endpoints if known.
4.  **Isolate the Issue:** Try simpler operations with `KnowledgeGraphManager` (e.g., fetching a known entity) to see if basic interaction works.
5.  **Refer to Documentation:**
    *   [KnowledgeGraphManager Usage Guide](../guides/kg-manager-usage.md)
    *   [MCP Integration Guide](../integrations/mcp/README.md)
    *   [KnowledgeGraphManager Implementation](../implementation/kg-manager.md)

*[This document is a placeholder. More specific troubleshooting steps will be added as common issues are identified and resolved.]*
