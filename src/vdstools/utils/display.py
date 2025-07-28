from IPython.display import HTML, display

class Display:
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
    def __init__(self):
        pass
    
    def show(self, html_content: str) -> None:
        display(HTML(html_content))