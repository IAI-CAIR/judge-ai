from flask import current_app
import os

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]

def ensure_upload_folder():
    os.makedirs(current_app.config["UPLOAD_FOLDER"], exist_ok=True)
