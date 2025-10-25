# UCR-02-Telemetry Documentation

This directory contains comprehensive documentation for the UCR-02-Telemetry system, built using [Sphinx](https://www.sphinx-doc.org/).

## Building the Documentation

### Prerequisites

-   Python 3.7 or newer
-   pip package manager

### Setup

1. Create and activate a Python virtual environment (recommended):

    ```bash
    python3 -m venv .docs-venv
    source .docs-venv/bin/activate  # On Windows: .docs-venv\Scripts\activate
    ```

2. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Building

To build the HTML documentation:

```bash
./build_docs.sh
```

Or manually:

```bash
make html
```

The built documentation will be available in `build/html/index.html`.

## Documentation Structure

-   **Architecture**: System design, data flow, and component interactions
-   **Backend**: Go backend implementation details
-   **Frontend**: React frontend implementation details
-   **Integration**: How to integrate new components and signals
-   **Networking**: Communication protocols and API specifications

## Contributing to Documentation

When adding or modifying documentation:

1. Place content in the appropriate section
2. Use RST format for all documentation files
3. Add any new files to the corresponding index.rst toctree
4. Include diagrams using Mermaid where appropriate
5. Build and verify the documentation locally before committing

## Mermaid Diagrams

This documentation uses Mermaid for diagrams. Use the following syntax:

```rst
.. mermaid::

   graph TD
     A[Component A] --> B[Component B]
     B --> C[Component C]
```

### Exporting Diagrams

You can export all Mermaid diagrams to standalone SVG and PNG files for use in presentations, reports, or other documentation:

#### Prerequisites

Install the Mermaid CLI tool:

```bash
npm install -g @mermaid-js/mermaid-cli
```

Or use npx without installation:

```bash
npx -p @mermaid-js/mermaid-cli mmdc --version
```

#### Usage

Run the export script:

```bash
python3 export_diagrams.py
```

This will:

1. Extract all Mermaid diagrams from RST files
2. Export each diagram as both SVG (vector) and PNG (raster) formats
3. Create an `exported_diagrams/` directory with all files
4. Generate an `index.html` gallery for easy browsing and downloading

#### Output

-   **SVG files**: Scalable vector graphics, best for presentations and print
-   **PNG files**: High-resolution raster images (2000px wide)
-   **index.html**: Interactive gallery with download links

Open the gallery:

```bash
open exported_diagrams/index.html  # macOS
xdg-open exported_diagrams/index.html  # Linux
start exported_diagrams/index.html  # Windows
```

## Markdown Support

This documentation also supports Markdown through the MyST parser. Use `.md` extension for Markdown files.

## Contacts

If you have questions about the documentation, please contact the UCR-02-Telemetry team.
