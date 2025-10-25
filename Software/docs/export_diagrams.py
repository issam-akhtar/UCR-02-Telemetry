#!/usr/bin/env python3
"""
Export Mermaid diagrams from Sphinx documentation to standalone image files.

This script extracts Mermaid diagram definitions from RST files and exports them
as both SVG and PNG formats using the Mermaid CLI (mmdc).

Requirements:
    - mermaid-cli (mmdc): npm install -g @mermaid-js/mermaid-cli
    
Usage:
    python export_diagrams.py
    
Output:
    Creates 'exported_diagrams/' directory with SVG and PNG files for each diagram.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

# Configuration
SOURCE_DIR = Path(__file__).parent / "source"
OUTPUT_DIR = Path(__file__).parent / "exported_diagrams"
MERMAID_CLI = "mmdc"  # mermaid-cli command


def check_mmdc_installed():
    """Check if mermaid-cli (mmdc) is installed."""
    try:
        result = subprocess.run(
            [MERMAID_CLI, "--version"],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode == 0:
            print(f"✓ Found mermaid-cli: {result.stdout.strip()}")
            return True
        return False
    except FileNotFoundError:
        return False


def extract_mermaid_diagrams(rst_file):
    """
    Extract Mermaid diagram definitions from an RST file.
    
    Returns:
        List of tuples: (diagram_content, file_context)
    """
    with open(rst_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match Mermaid code blocks
    # Matches: .. mermaid:: followed by indented content
    pattern = r'\.\.\s+mermaid::\s*\n\n((?:[ \t]+.+\n?)+)'
    
    diagrams = []
    for match in re.finditer(pattern, content):
        diagram_text = match.group(1)
        # Remove indentation (typically 3 or 4 spaces)
        lines = diagram_text.split('\n')
        dedented_lines = []
        for line in lines:
            if line.strip():  # Skip empty lines
                # Remove leading whitespace (typically 3 spaces for RST)
                dedented_lines.append(line[3:] if len(line) > 3 else line.strip())
        
        diagram_content = '\n'.join(dedented_lines)
        diagrams.append(diagram_content)
    
    return diagrams


def create_output_directory():
    """Create output directory if it doesn't exist."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"✓ Output directory: {OUTPUT_DIR}")


def export_diagram(diagram_content, output_name, format='svg'):
    """
    Export a single diagram using mermaid-cli.
    
    Args:
        diagram_content: Mermaid diagram definition
        output_name: Base name for output file (without extension)
        format: Output format ('svg' or 'png')
    """
    # Create temporary file for diagram content
    temp_file = OUTPUT_DIR / f"{output_name}.mmd"
    output_file = OUTPUT_DIR / f"{output_name}.{format}"
    
    try:
        # Write diagram to temp file
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(diagram_content)
        
        # Run mermaid-cli
        cmd = [
            MERMAID_CLI,
            '-i', str(temp_file),
            '-o', str(output_file),
            '-t', 'default',  # theme
            '-b', 'transparent'  # background
        ]
        
        if format == 'png':
            cmd.extend(['-w', '2000'])  # width for PNG
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            print(f"  ✓ Exported: {output_file.name}")
            return True
        else:
            print(f"  ✗ Failed: {output_file.name}")
            print(f"    Error: {result.stderr}")
            return False
    
    finally:
        # Clean up temp file
        if temp_file.exists():
            temp_file.unlink()


def main():
    """Main execution function."""
    print("=" * 70)
    print("Mermaid Diagram Export Tool")
    print("=" * 70)
    print()
    
    # Check prerequisites
    if not check_mmdc_installed():
        print()
        print("✗ Error: mermaid-cli (mmdc) is not installed!")
        print()
        print("Installation instructions:")
        print("  npm install -g @mermaid-js/mermaid-cli")
        print()
        print("Or using npx (no installation):")
        print("  npx -p @mermaid-js/mermaid-cli mmdc --version")
        print()
        sys.exit(1)
    
    print()
    create_output_directory()
    print()
    
    # Find all RST files
    rst_files = list(SOURCE_DIR.rglob("*.rst"))
    print(f"✓ Found {len(rst_files)} RST files")
    print()
    
    # Extract and export diagrams
    total_diagrams = 0
    exported_count = 0
    
    for rst_file in rst_files:
        diagrams = extract_mermaid_diagrams(rst_file)
        
        if diagrams:
            rel_path = rst_file.relative_to(SOURCE_DIR)
            print(f"Processing: {rel_path} ({len(diagrams)} diagrams)")
            
            for i, diagram in enumerate(diagrams, 1):
                total_diagrams += 1
                
                # Create output name: filename_diagram1, filename_diagram2, etc.
                base_name = rst_file.stem
                output_name = f"{base_name}_diagram{i}"
                
                # Export as both SVG and PNG
                success_svg = export_diagram(diagram, output_name, 'svg')
                success_png = export_diagram(diagram, output_name, 'png')
                
                if success_svg or success_png:
                    exported_count += 1
            
            print()
    
    # Summary
    print("=" * 70)
    print(f"Export Complete!")
    print(f"  Total diagrams found: {total_diagrams}")
    print(f"  Successfully exported: {exported_count}")
    print(f"  Output directory: {OUTPUT_DIR}")
    print("=" * 70)
    
    # Create index file
    create_index_file(rst_files)


def create_index_file(rst_files):
    """Create an index HTML file listing all exported diagrams."""
    index_file = OUTPUT_DIR / "index.html"
    
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UCR-02-Telemetry System Diagrams</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .diagram-section {
            background: white;
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .diagram-section h2 {
            color: #555;
            margin-top: 0;
        }
        .diagram-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        .diagram-card {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            text-align: center;
            background: #fafafa;
        }
        .diagram-card img {
            max-width: 100%;
            height: auto;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .diagram-card h3 {
            font-size: 14px;
            margin: 10px 0 5px 0;
            color: #333;
        }
        .download-links {
            margin-top: 8px;
        }
        .download-links a {
            display: inline-block;
            margin: 0 5px;
            padding: 5px 10px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-size: 12px;
        }
        .download-links a:hover {
            background: #0056b3;
        }
        .info {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>UCR-02-Telemetry System Diagrams</h1>
    
    <div class="info">
        <p><strong>About:</strong> This gallery contains all diagrams extracted from the UCR-02-Telemetry 
        system documentation. Each diagram is available in both SVG (vector) and PNG (raster) formats.</p>
        <p><strong>Usage:</strong> Right-click any diagram to save, or use the download links below each diagram.</p>
    </div>
"""
    
    # Group diagrams by source file
    diagram_files = sorted(OUTPUT_DIR.glob("*.svg"))
    
    if diagram_files:
        html_content += '    <div class="diagram-section">\n'
        html_content += '        <h2>All Diagrams</h2>\n'
        html_content += '        <div class="diagram-grid">\n'
        
        for svg_file in diagram_files:
            base_name = svg_file.stem
            png_file = svg_file.with_suffix('.png')
            
            # Create readable title from filename
            title = base_name.replace('_diagram', ' - Diagram ').replace('_', ' ').title()
            
            html_content += f'            <div class="diagram-card">\n'
            html_content += f'                <img src="{svg_file.name}" alt="{title}">\n'
            html_content += f'                <h3>{title}</h3>\n'
            html_content += f'                <div class="download-links">\n'
            html_content += f'                    <a href="{svg_file.name}" download>Download SVG</a>\n'
            if png_file.exists():
                html_content += f'                    <a href="{png_file.name}" download>Download PNG</a>\n'
            html_content += f'                </div>\n'
            html_content += f'            </div>\n'
        
        html_content += '        </div>\n'
        html_content += '    </div>\n'
    
    html_content += """
    <div class="info" style="margin-top: 40px;">
        <p><strong>Generated by:</strong> UCR-02-Telemetry Documentation Export Tool</p>
        <p><strong>Documentation:</strong> <a href="../build/html/index.html">View Full Documentation</a></p>
    </div>
</body>
</html>
"""
    
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print()
    print(f"✓ Created index file: {index_file}")
    print(f"  Open in browser: file://{index_file.absolute()}")


if __name__ == "__main__":
    main()
