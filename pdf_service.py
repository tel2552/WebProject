import io
from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Setup Jinja2 environment
# Make sure the path to the 'templates' directory is correct relative to where this script runs
# or provide an absolute path.
try:
    template_loader = FileSystemLoader(searchpath="./templates") # Adjust if your structure is different
except Exception as e:
    print(f"Error setting up template loader: {e}")
    # Fallback or more robust path detection might be needed if running from different contexts
    # For example, if main.py is in WebProject and templates is WebProject/templates
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir) # Assuming pdf_service.py is in WebProject directory
    templates_dir = os.path.join(project_root, "templates")
    if not os.path.exists(templates_dir): # If pdf_service.py is one level deeper
        project_root = os.path.dirname(project_root)
        templates_dir = os.path.join(project_root, "templates")

    template_loader = FileSystemLoader(searchpath=templates_dir)


jinja_env = Environment(
    loader=template_loader,
    autoescape=select_autoescape(['html', 'xml'])
)

def generate_complaint_pdf_from_data(complaint_data: dict) -> bytes:
    """
    Generates a PDF document from complaint data using an HTML template.
    """
    try:
        template = jinja_env.get_template("pdf_complaint_template.html")
    except Exception as e:
        raise RuntimeError(f"Could not load PDF template: {e}")

    # Prepare context data for the template
    # Ensure all expected fields are present, providing defaults if necessary
    context = {
        "complaint": complaint_data,
        "admin_name": complaint_data.get("admin_name_filled_by", complaint_data.get("processed_by_admin", "N/A")),
        "complainant_name": complaint_data.get("name", "N/A"),
        "title": complaint_data.get("title", "N/A"),
        "details": complaint_data.get("details", "N/A"),
        "department": complaint_data.get("team", "N/A"),
        "additional_info": complaint_data.get("additional_info", "N/A"),
        "recipients": complaint_data.get("recipients", []),
        "severity_level": complaint_data.get("severity_level", "N/A"),
        "approver_recommendation": complaint_data.get("approver_recommendation", "N/A"),
        "complaint_id_display": complaint_data.get("_id", complaint_data.get("id", "N/A")) # Use _id or id
    }

    # Add correction details with defaults
    for i in range(1, 6):
        context[f"correction{i}"] = complaint_data.get(f"correction{i}", "N/A")
        context[f"inspector_name{i}"] = complaint_data.get(f"inspector_name{i}", "N/A")
        context[f"inspection_date{i}"] = complaint_data.get(f"inspection_date{i}", "N/A")


    html_string = template.render(context)

    # Base URL might be needed if your HTML template links to local CSS files or images
    # For inline CSS, this is not strictly necessary.
    # html = HTML(string=html_string, base_url=".") # Example if you have relative paths in HTML
    pdf_bytes = HTML(string=html_string).write_pdf()
    return pdf_bytes

