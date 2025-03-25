import os
from datetime import timedelta


class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/user")
    JWT_SECRET_KEY = os.getenv("keepsecure", "NOTHINGISECURE")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)  # Adjust as needed (e.g., 12 hours)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)   # Refresh token valid for 7 days

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app/uploads")
    
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
    
    

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
