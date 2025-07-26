"""
HTML Output Utilities for VDS Tools
====================================

This module provides utilities for outputting raw HTML content in Jupyter notebooks.
It includes functions to display HTML content directly without text parsing.
"""

from IPython.display import HTML, display
from typing import Any, Optional


def display_html(html_content: str) -> None:
    """
    Display raw HTML content directly in Jupyter notebook
    
    This function outputs HTML content without text parsing, allowing
    custom VDS-tagged HTML to be rendered properly in the frontend.
    
    Args:
        html_content (str): Raw HTML content to display
        
    Example:
        >>> from vdstools import display_html
        >>> html = '<vds-container><vds-title>My Data</vds-title></vds-container>'
        >>> display_html(html)
    """
    display(HTML(html_content))


def html_output(content: Any) -> HTML:
    """
    Create an HTML object for direct output
    
    This function creates an IPython HTML object that can be used
    to output raw HTML content in Jupyter notebooks.
    
    Args:
        content: Content to convert to HTML output (usually string)
        
    Returns:
        HTML: IPython HTML object for direct display
        
    Example:
        >>> from vdstools import html_output
        >>> html = '<vds-container><vds-title>My Data</vds-title></vds-container>'
        >>> html_output(html)
    """
    return HTML(str(content))


def print_html(html_content: str, return_object: bool = False) -> Optional[HTML]:
    """
    Print HTML content with option to return HTML object
    
    This function provides a simple way to output HTML content,
    with an option to return the HTML object for further use.
    
    Args:
        html_content (str): HTML content to output
        return_object (bool): Whether to return the HTML object
        
    Returns:
        Optional[HTML]: HTML object if return_object is True, None otherwise
        
    Example:
        >>> from vdstools import print_html
        >>> html = '<vds-container><vds-title>My Data</vds-title></vds-container>'
        >>> print_html(html)  # Direct output
        >>> obj = print_html(html, return_object=True)  # Get object
    """
    html_obj = HTML(html_content)
    display(html_obj)
    
    if return_object:
        return html_obj
    return None


class HTMLRenderer:
    """
    HTML rendering utility class for VDS Tools
    
    This class provides methods for rendering various types of content
    as HTML in Jupyter notebooks, with special support for VDS-tagged content.
    """
    
    def __init__(self):
        """Initialize HTML renderer"""
        pass
    
    def render(self, content: str) -> HTML:
        """
        Render content as HTML
        
        Args:
            content (str): Content to render
            
        Returns:
            HTML: Rendered HTML object
        """
        return HTML(content)
    
    def display(self, content: str) -> None:
        """
        Display content as HTML
        
        Args:
            content (str): Content to display
        """
        display(HTML(content))
    
    def wrap_vds_container(self, inner_content: str, title: str = "") -> str:
        """
        Wrap content in VDS container tags
        
        Args:
            inner_content (str): Content to wrap
            title (str): Optional title for the container
            
        Returns:
            str: Wrapped HTML content
        """
        title_html = f"<vds-title>{title}</vds-title>" if title else ""
        return f"""
        <vds-container>
            {title_html}
            {inner_content}
        </vds-container>
        """
    
    def create_vds_table(self, headers: list, rows: list, table_class: str = "") -> str:
        """
        Create VDS-styled table
        
        Args:
            headers (list): Table headers
            rows (list): Table rows (list of lists)
            table_class (str): Additional CSS class for table
            
        Returns:
            str: VDS table HTML
        """
        table_class_attr = f' class="{table_class}"' if table_class else ""
        
        # Build header
        header_html = "<vds-tr>" + "".join(f"<vds-th>{header}</vds-th>" for header in headers) + "</vds-tr>"
        
        # Build rows
        rows_html = ""
        for row in rows:
            row_html = "<vds-tr>" + "".join(f"<vds-td>{cell}</vds-td>" for cell in row) + "</vds-tr>"
            rows_html += row_html
        
        return f"""
        <vds-table{table_class_attr}>
            <vds-thead>
                {header_html}
            </vds-thead>
            <vds-tbody>
                {rows_html}
            </vds-tbody>
        </vds-table>
        """


# Create global renderer instance
_html_renderer = HTMLRenderer()

# Convenience functions using global renderer
def render_html(content: str) -> HTML:
    """Render content as HTML using global renderer"""
    return _html_renderer.render(content)

def render_vds_container(inner_content: str, title: str = "") -> HTML:
    """Render content wrapped in VDS container using global renderer"""
    wrapped_content = _html_renderer.wrap_vds_container(inner_content, title)
    return _html_renderer.render(wrapped_content)

def render_vds_table(headers: list, rows: list, table_class: str = "") -> HTML:
    """Render VDS table using global renderer"""
    table_html = _html_renderer.create_vds_table(headers, rows, table_class)
    return _html_renderer.render(table_html)


# Quick display functions
def quick_display_html(html_content: str) -> None:
    """Quick function to display HTML content"""
    display_html(html_content)

def quick_display_vds(inner_content: str, title: str = "") -> None:
    """Quick function to display content in VDS container"""
    wrapped_content = _html_renderer.wrap_vds_container(inner_content, title)
    display_html(wrapped_content)


def help_html_output():
    """
    Display help information for HTML output utilities
    
    This function provides comprehensive documentation for all HTML output
    functions and classes available in the VDS Tools package.
    """
    help_content = """
    =============================================================================
    VDS TOOLS - HTML OUTPUT UTILITIES
    =============================================================================
    
    OVERVIEW:
    This module provides utilities for outputting raw HTML content in Jupyter
    notebooks, with special support for VDS-tagged content that integrates
    with the frontend styling system.
    
    MAIN FUNCTIONS:
    ===============
    
    1. display_html(html_content: str)
       - Display raw HTML content directly in Jupyter notebook
       - Bypasses text parsing to render VDS tags properly
       
    2. html_output(content: Any) -> HTML
       - Create an IPython HTML object for direct output
       - Returns HTML object that can be displayed or stored
       
    3. print_html(html_content: str, return_object: bool = False)
       - Print HTML content with option to return HTML object
       - Provides both display and object creation functionality
    
    HTML RENDERER CLASS:
    ====================
    
    HTMLRenderer class provides advanced HTML rendering capabilities:
    - render(content: str) -> HTML
    - display(content: str) -> None
    - wrap_vds_container(inner_content: str, title: str = "") -> str
    - create_vds_table(headers: list, rows: list, table_class: str = "") -> str
    
    QUICK FUNCTIONS:
    ================
    
    - quick_display_html(html_content: str)
    - quick_display_vds(inner_content: str, title: str = "")
    - render_html(content: str) -> HTML
    - render_vds_container(inner_content: str, title: str = "") -> HTML
    - render_vds_table(headers: list, rows: list, table_class: str = "") -> HTML
    
    USAGE EXAMPLES:
    ===============
    
    # Basic HTML output
    from vdstools import display_html, html_output
    
    html_content = '<vds-container><vds-title>My Data</vds-title></vds-container>'
    display_html(html_content)  # Direct display
    html_obj = html_output(html_content)  # Get HTML object
    
    # Using renderer class
    from vdstools import HTMLRenderer
    
    renderer = HTMLRenderer()
    table_html = renderer.create_vds_table(
        headers=['Name', 'Value'],
        rows=[['Item1', '100'], ['Item2', '200']]
    )
    renderer.display(table_html)
    
    # Quick functions
    from vdstools import quick_display_html, quick_display_vds
    
    quick_display_html('<vds-title>Quick Title</vds-title>')
    quick_display_vds('Content here', 'Container Title')
    
    INTEGRATION WITH VDS TOOLS:
    ============================
    
    These HTML output utilities are designed to work seamlessly with
    other VDS Tools functions that generate HTML content:
    
    # Example integration
    from vdstools import datapreview, display_html
    
    # Get HTML output from datapreview
    html_content = datapreview("data.csv").top5line()
    
    # Display as raw HTML (no text parsing)
    display_html(html_content)
    
    VDS TAGS SUPPORT:
    =================
    
    All functions support VDS-prefixed HTML tags that integrate with
    the frontend styling system:
    
    - vds-container, vds-section, vds-info-panel
    - vds-table, vds-thead, vds-tbody, vds-tr, vds-th, vds-td
    - vds-title, vds-cell, vds-numeric, vds-categorical
    - And many more (see frontend CSS for complete list)
    
    TROUBLESHOOTING:
    ================
    
    If HTML content is displaying as text instead of rendered HTML:
    1. Use display_html() instead of print()
    2. Ensure IPython.display is available in your environment
    3. Check that HTML content is properly formatted
    4. Verify VDS CSS is loaded in the frontend
    
    =============================================================================
    """
    print(help_content)
    return help_content