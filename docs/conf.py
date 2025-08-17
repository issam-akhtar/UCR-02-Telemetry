# Sphinx configuration for UCR-02 Telemetry docs
import os
import sys
sys.path.insert(0, os.path.abspath('..'))

project = 'UCR-02 Telemetry'
html_title = project + ' Documentation'

extensions = [
    'sphinx_rtd_theme',
    'sphinxcontrib.mermaid',
    'myst_parser',
]

# mermaid configuration: ensure mermaid CLI is installed on the system for
# rendering if needed. Some environments render client-side.
# Request a modern mermaid.js version for the sphinxcontrib-mermaid extension.
# sphinxcontrib-mermaid requires mermaid.js >= 10.3.0; set to that minimum.
mermaid_version = "10.3.0"

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

# Allow markdown files via myst-parser
myst_enable_extensions = [
    'deflist',
    'html_admonition',
    'html_image',
]

# General substitutions
rst_prolog = """
.. |project| replace:: UCR-02 Telemetry
"""
