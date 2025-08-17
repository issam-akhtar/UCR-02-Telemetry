Development setup
=================

This page explains how to prepare your machine for development and how to
bring the full stack up quickly with Docker Compose.

Prerequisites
-------------

- Docker and Docker Compose (v2 recommended)
- Node.js (LTS) for frontend development
- Go (1.18+) for backend development
- Python 3.8+ to build docs (optional)

Quick Docker-based setup
------------------------

1. From the repo root, open the DevEnv folder:

.. code-block:: bash

   cd Software/DevEnvSetup
   docker-compose up --build

2. What the compose file provides:

- backend container (builds from ``Software/backend-processing/Dockerfile``)
- frontend container (builds from ``Software/telemetry-app/Dockerfile``)
- database container (Postgres or SQLite helper)
- optional CSV simulator service

Native development (optional)
-----------------------------

Frontend
~~~~~~~~

.. code-block:: bash

   cd Software/telemetry-app
   npm install
   npm run dev

Backend
~~~~~~~

.. code-block:: bash

   cd Software/backend-processing
   go build ./cmd/telemetryserver
   ./telemetryserver --config configs/config.yaml

Tips
----

- Use the Docker Compose for easy environment parity.
- Use the simulator when developing decoding or charting features to get
  repeatable inputs.
