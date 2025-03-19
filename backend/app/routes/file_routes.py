from flask import Blueprint, send_from_directory, current_app
import os

file_bp = Blueprint("file_bp",__name__, url_prefix="/api")

@file_bp.route("/uploads/<path:foldername>/<path:filename>")
def serve_file(foldername, filename):
    """
    Serve the requested file (PDF or image) from the uploads directory.
    """
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(upload_folder, foldername, filename)

    if not os.path.exists(file_path):
        return {"error": "File not found"}, 404

    return send_from_directory(os.path.dirname(file_path), os.path.basename(file_path))
