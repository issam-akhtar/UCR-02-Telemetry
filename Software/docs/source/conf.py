# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'UCR-02-Telemetry System'
copyright = '2025, University of Calgary Racing Team'
author = 'University of Calgary Racing Team'
release = '1.0.0'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.todo',
    'sphinx.ext.githubpages',
    'sphinx.ext.graphviz',
    'sphinx.ext.ifconfig',
    'sphinx.ext.intersphinx',
    'sphinx_rtd_theme',
    'myst_parser',
    'sphinxcontrib.mermaid',
]

templates_path = ['_templates']
exclude_patterns = []

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']
html_logo = '_static/logo.png'
html_favicon = '_static/favicon.ico'

# Custom CSS for enhanced responsiveness
html_css_files = [
    'custom.css',
]

# RTD Theme Options - Enhanced responsiveness and UX
html_theme_options = {
    'canonical_url': '',
    'analytics_id': '',
    'logo_only': False,
    'display_version': True,
    'prev_next_buttons_location': 'both',  # Navigation buttons at top and bottom
    'style_external_links': True,
    'vcs_pageview_mode': '',
    'style_nav_header_background': '#2c3e50',
    # Toc options
    'collapse_navigation': False,  # Keep navigation expanded for better UX
    'sticky_navigation': True,     # Sticky sidebar navigation
    'navigation_depth': 4,         # Show 4 levels in navigation
    'includehidden': True,
    'titles_only': False           # Show all section titles, not just page titles
}

# -- Options for Mermaid diagrams --------------------------------------------
mermaid_params = ['--theme', 'default']

# -- Options for MyST parser -------------------------------------------------
myst_enable_extensions = [
    "amsmath",
    "colon_fence",
    "deflist",
    "dollarmath",
    "html_image",
    "html_admonition",
    "replacements",
    "smartquotes",
    "substitution",
    "tasklist",
]

myst_heading_anchors = 3