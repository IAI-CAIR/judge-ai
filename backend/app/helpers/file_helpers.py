import os
from werkzeug.utils import secure_filename
from flask import current_app
import fitz
from PIL import Image

def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]

def create_pdf_preview(file_path):
    """
    Creates a preview image from the first page of a PDF
    Returns the preview filename
    """
    filename = os.path.basename(file_path)
    preview_filename = f"{filename.rsplit('.', 1)[0]}.jpg"
    preview_path = os.path.join(os.path.dirname(file_path), preview_filename)

    try:
        doc = fitz.open(file_path)
        page = doc[0]  # Get first page
        pix = page.get_pixmap()
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img.save(preview_path, "JPEG")
        print(f"Preview image saved at: {preview_path}")
    except Exception as e:
        print(f"Failed to create preview: {e}")
        raise

    return preview_filename