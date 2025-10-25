Contributing to Documentation
==============================

This guide explains how to contribute to the UCR-02-Telemetry documentation.

Documentation Philosophy
------------------------

Our documentation follows these principles:

* **Clarity**: Write for developers who are new to the system
* **Completeness**: Cover both the "what" and the "why"
* **Practicality**: Include working code examples and commands
* **Maintainability**: Keep docs close to the code they describe
* **Discoverability**: Use cross-references and clear navigation

Documentation Structure
-----------------------

The documentation is organized into six main sections:

.. code-block:: text

   docs/source/
   ├── architecture/      # System design and high-level concepts
   ├── backend/          # Go backend implementation details
   ├── frontend/         # React frontend implementation details
   ├── integration/      # Adding signals, deployment, testing
   ├── networking/       # APIs, protocols, communication
   ├── troubleshooting/  # Problem-solving guides
   ├── glossary.rst      # Technical terms and acronyms
   ├── getting_started.rst  # Quick start guide
   └── index.rst         # Documentation homepage

When to Update Documentation
----------------------------

Documentation should be updated when:

* **Adding new features**: Document new CAN signals, API endpoints, UI components
* **Changing behavior**: Update docs when modifying existing functionality
* **Fixing bugs**: Document workarounds or configuration changes
* **Improving performance**: Document new optimization techniques
* **Deprecating features**: Mark outdated information and provide alternatives

.. important::
   Documentation updates should be included in the same pull request as code changes.

Getting Started with Documentation
----------------------------------

Setting Up Your Environment
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Install Python dependencies:

.. code-block:: bash

   cd docs
   python3 -m venv .docs-venv
   source .docs-venv/bin/activate  # On Windows: .docs-venv\Scripts\activate
   pip install -r requirements.txt

2. Build the documentation:

.. code-block:: bash

   make html

3. View the documentation:

.. code-block:: bash

   open build/html/index.html  # macOS
   # or
   xdg-open build/html/index.html  # Linux
   # or
   start build/html/index.html  # Windows

4. Enable auto-rebuild (optional):

.. code-block:: bash

   pip install sphinx-autobuild
   sphinx-autobuild source build/html

This will automatically rebuild and refresh your browser when you save changes.

Writing Documentation
---------------------

File Format
~~~~~~~~~~~

Documentation is written in **reStructuredText (.rst)** format. RST provides rich formatting capabilities and integrates well with Sphinx.

Basic RST Syntax
~~~~~~~~~~~~~~~~

**Headings:**

.. code-block:: rst

   Page Title
   ==========

   Section Heading
   ---------------

   Subsection Heading
   ~~~~~~~~~~~~~~~~~~

**Text Formatting:**

.. code-block:: rst

   *italic* or **bold** or ``code``

**Lists:**

.. code-block:: rst

   * Bullet point
   * Another point

   1. Numbered item
   2. Another item

**Code Blocks:**

.. code-block:: rst

   .. code-block:: go

      func main() {
          fmt.Println("Hello, World!")
      }

Supported languages: ``go``, ``javascript``, ``python``, ``bash``, ``sql``, ``json``, ``yaml``, ``protobuf``, ``rst``

**Links:**

.. code-block:: rst

   External link: `Google <https://google.com>`_
   Internal doc: :doc:`architecture/overview`
   Section reference: :ref:`label-name`

Using Admonitions
~~~~~~~~~~~~~~~~~

Admonitions draw attention to important information:

.. code-block:: rst

   .. note::
      This is a note for additional context.

   .. warning::
      This is a warning about potential issues.

   .. tip::
      This is a helpful tip or best practice.

   .. important::
      This is critical information.

   .. seealso::
      Links to related documentation.

**When to use each type:**

* **note**: Additional context, explanations, or non-critical information
* **warning**: Potential pitfalls, breaking changes, or data loss risks
* **tip**: Best practices, shortcuts, or helpful suggestions
* **important**: Critical information that must not be missed
* **seealso**: Cross-references to related documentation

Creating Tables
~~~~~~~~~~~~~~~

**Simple table:**

.. code-block:: rst

   .. list-table::
      :header-rows: 1
      :widths: 30 70

      * - Column 1
        - Column 2
      * - Data 1
        - Data 2

Adding Diagrams
~~~~~~~~~~~~~~~

We use Mermaid for diagrams:

.. code-block:: rst

   .. mermaid::

      flowchart LR
        A[Component A] --> B[Component B]
        B --> C[Component C]

Common diagram types: ``flowchart``, ``sequenceDiagram``, ``graph``, ``classDiagram``

Cross-Referencing
~~~~~~~~~~~~~~~~~

Link between documentation pages:

.. code-block:: rst

   See :doc:`backend/can_decoder` for details.
   Refer to :ref:`custom-label` for more information.

Style Guidelines
----------------

Writing Style
~~~~~~~~~~~~~

* **Use active voice**: "The decoder transforms data" not "Data is transformed by the decoder"
* **Be concise**: Remove unnecessary words
* **Use present tense**: "The system processes" not "The system will process"
* **Include context**: Explain why, not just what
* **Define acronyms**: Always define on first use

Code Examples
~~~~~~~~~~~~~

* **Use real code**: Examples should be runnable without modification
* **Include context**: Show imports, setup, and cleanup
* **Add comments**: Explain non-obvious parts
* **Show output**: Include expected results when helpful

.. code-block:: rst

   Example:

   .. code-block:: go

      // Get a map from the pool
      resultMap := candecoder.GetMapFromPool()
      defer candecoder.ReturnMapToPool(resultMap)  // Always return!

      // Decode the frame
      err := candecoder.DecodeFrame(frameID, dataBytes, resultMap)
      if err != nil {
          log.Printf("Error: %v", err)
          return
      }

File Naming
~~~~~~~~~~~

* Use lowercase with underscores: ``adding_new_signals.rst``
* Be descriptive: ``websocket_client.rst`` not ``ws.rst``
* Match content: File name should reflect the page title

Common Documentation Tasks
--------------------------

Adding a New Page
~~~~~~~~~~~~~~~~~

1. Create the ``.rst`` file in the appropriate section directory
2. Add it to the section's ``index.rst`` toctree:

.. code-block:: rst

   .. toctree::
      :maxdepth: 2

      overview
      your_new_page

3. Build and verify: ``make html``

Documenting a New API Endpoint
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Add to ``networking/rest_api.rst``:

.. code-block:: rst

   Get New Data Type
   ~~~~~~~~~~~~~~~~~

   Retrieves historical data for the new type.

   **Endpoint**: ``GET /api/v1/historical/new-data``

   **Query Parameters**:

   * ``start_time`` (required) - Start time in ISO format
   * ``end_time`` (required) - End time in ISO format
   * ``limit`` (optional) - Maximum records (default: 1000)

   **Example Request**:

   .. code-block:: bash

      curl "http://localhost:9092/api/v1/historical/new-data?\
      start_time=2025-01-01T00:00:00Z&\
      end_time=2025-01-02T00:00:00Z"

   **Example Response**:

   .. code-block:: json

      {
        "status": "success",
        "data": [...]
      }

Documenting a New CAN Signal
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Update these files:

1. **integration/can_messages.rst** - Add signal to message list
2. **integration/adding_new_signals.rst** - Update if the process changed
3. **glossary.rst** - Add any new terminology

Updating for Breaking Changes
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Add a **warning** admonition to the affected documentation
2. Document the old behavior and the new behavior
3. Provide migration instructions
4. Update any code examples

Example:

.. code-block:: rst

   .. warning::
      Breaking change in v2.0: The `processData()` function now requires
      a third parameter. Update your code:

      Old: ``processData(frameID, data)``
      New: ``processData(frameID, data, timestamp)``

Testing Documentation
---------------------

Before Committing
~~~~~~~~~~~~~~~~~

1. **Build without errors**:

.. code-block:: bash

   cd docs
   make clean
   make html

2. **Check for warnings**: Sphinx will warn about broken links, missing references, etc.

3. **Verify locally**: Open ``build/html/index.html`` and navigate to your changes

4. **Check cross-references**: Click internal links to ensure they work

5. **Test code examples**: Copy-paste and run any code examples

Common Build Errors
~~~~~~~~~~~~~~~~~~~

**"WARNING: toctree contains reference to nonexistent document"**

* Solution: Check file path and name in the toctree

**"WARNING: undefined label"**

* Solution: Ensure the label exists or use ``:doc:`` instead of ``:ref:``

**"ERROR: Unknown directive type 'note'"**

* Solution: Check indentation - directives must have content indented

Documentation Review Checklist
-------------------------------

Before submitting a pull request, verify:

- [ ] Documentation builds without errors or warnings
- [ ] All code examples are tested and work
- [ ] Cross-references link to correct pages
- [ ] Diagrams render correctly
- [ ] Admonitions are used appropriately
- [ ] New terms are added to glossary
- [ ] Style guidelines are followed
- [ ] Spelling and grammar are correct
- [ ] Screenshots (if any) are clear and relevant

Pull Request Guidelines
-----------------------

When submitting documentation changes:

1. **Title**: Use clear, descriptive titles like "docs: Add WebSocket connection guide"

2. **Description**: Explain what changed and why:

   .. code-block:: text

      ## Changes
      - Added troubleshooting guide for WebSocket connections
      - Updated API documentation for new endpoints
      - Fixed broken links in architecture section

      ## Motivation
      Users were struggling with WebSocket configuration

3. **Link to issues**: Reference any related issues

4. **Request review**: Tag someone familiar with the topic

Building for Production
-----------------------

For deployment or releases:

.. code-block:: bash

   cd docs
   make clean
   make html
   # Documentation is in build/html/

Resources
---------

* **Sphinx Documentation**: https://www.sphinx-doc.org/
* **reStructuredText Primer**: https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html
* **Mermaid Documentation**: https://mermaid.js.org/
* **Read the Docs Theme**: https://sphinx-rtd-theme.readthedocs.io/

Questions?
----------

If you have questions about documentation:

* Check existing documentation for examples
* Ask in the team chat or open an issue
* Review this contributing guide

.. tip::
   When in doubt, look at existing documentation pages for formatting examples!

Thank You!
----------

Thank you for contributing to the UCR-02-Telemetry documentation. Good documentation helps everyone work more effectively!
