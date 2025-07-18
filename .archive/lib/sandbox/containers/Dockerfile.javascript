# VANA Sandbox - JavaScript/Node.js Execution Environment
# Secure, isolated Node.js environment for code execution

FROM node:20-slim

# Create non-root user for security
RUN groupadd -r sandbox && useradd -r -g sandbox -m -s /bin/bash sandbox

# Install essential packages and clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create workspace directory
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace

# Install common Node.js packages
COPY package.json /tmp/package.json
RUN cd /tmp && npm install --production && \
    mkdir -p /workspace/node_modules && \
    cp -R /tmp/node_modules/* /workspace/node_modules/ && \
    chown -R sandbox:sandbox /workspace/node_modules && \
    rm -rf /tmp/node_modules /tmp/package.json

# Set up security restrictions
RUN chmod 755 /workspace && \
    chmod -R 755 /workspace/node_modules

# Switch to non-root user
USER sandbox

# Set working directory
WORKDIR /workspace

# Set environment variables
ENV NODE_ENV=sandbox
ENV HOME=/workspace
ENV USER=sandbox
ENV SHELL=/bin/bash
ENV NODE_PATH=/workspace/node_modules

# Default command
CMD ["node"]
