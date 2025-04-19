# Korvus Cloud Run Deployment

This directory contains the TSAPI backend to run Korvus as a Service on Cloud Run.

This is used by agents to /search memory and /embed content with metadata.

It requires no dependencies or database.

Deployment flow:

```sh
goit clone https://github.com/NickB03/vana
cd to korvus_config
docker build -t vana-korvus
gcp container images:build.timestamp

```

RunTime: Cloud Run will build and expose the UVICORN server on 8080 internally.
