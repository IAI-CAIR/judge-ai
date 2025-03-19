from flask import Blueprint, request, jsonify
from app.extensions import mongo
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from flask_jwt_extended import create_access_token
import traceback

google_login_bp = Blueprint("google_login_bp", __name__)

@google_login_bp.route("/api/google-login", methods=["POST"])
def google_login():
    try:
        data = request.get_json()
        id_token_str = data.get("token")
        if not id_token_str:
            return jsonify({"message": "Missing token"}), 400

        # Verify token
        try:
            credentials = id_token.verify_oauth2_token(
                id_token_str, Request(), "YOUR_GOOGLE_CLIENT_ID"
            )
        except ValueError as e:
            return jsonify({"message": "Invalid token", "error": str(e)}), 401

        email = credentials.get("email")

        # You must get the database instance inside the route handler
        db_users = mongo.db.users

        user = db_users.find_one({"email": email})

        if not user:
            user_data = {
                "name": credentials.get("name", "Unknown User"),
                "email": email,
                "password": None,
                "bio": "",
                "status": "Available",
                "avatar": credentials.get("picture"),
            }
            user_id = db_users.insert_one(user_data).inserted_id
            user = db_users.find_one({"_id": user_id})

        access_token = create_access_token(identity=str(user["_id"]))

        return jsonify({
            "access_token": access_token,
            "message": "Logged in successfully",
            "userProfile": {
                "name": user.get("name"),
                "email": user.get("email"),
                "avatar": user.get("avatar"),
            },
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": "Google login failed", "error": str(e)}), 500
