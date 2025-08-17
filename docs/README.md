This folder contains the Sphinx documentation for the UCR-02 Telemetry project.

## Structure

-   index.rst: reorganized top-level table-of-contents (Getting started, Architecture, Developer reference, API & Protocols).
-   guide.rst: user-facing guide and overview.
-   dev_setup.rst: local development environment and build steps.
-   \*\_structure.rst: frontend/backend structure pages describing where to change code.

## Build

1. Create a Python virtualenv (recommended):

    python3 -m venv .venv
    source .venv/bin/activate

2. Install requirements:

    pip install -r requirements.txt

3. Build HTML:

    make html

The generated site will be in \_build/html/.
