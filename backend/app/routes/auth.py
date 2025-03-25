from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from google.oauth2 import id_token
from ..models.user import User
from ..helpers.validation_helpers import is_valid_email
from google.auth.transport.requests import Request
from ..extensions import bcrypt
from bson.objectid import ObjectId
import traceback

bp = Blueprint("auth", __name__, url_prefix="/api")


@bp.route("/", methods=["GET"])
def index():
    return jsonify({"message": "Hello, World!"}), 200


@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all([name, email, password]):
        return jsonify({"message": "All fields are required"}), 400
    if not is_valid_email(email):
        return jsonify({"message": "Invalid email format"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400

    if User.find_by_email(email):
        return jsonify({"message": "User already exists"}), 400

    user_id = User.create(name, email, password).inserted_id
    return jsonify({"message": "User registered successfully", "user_id": str(user_id)}), 201


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.find_by_email(email)
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user["_id"]))
    return jsonify({"access_token": access_token, "message": "Logged in successfully", "user": user["email"]}), 200


@bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"message": "Access granted", "user": {"email": user["email"]}}), 200


@bp.route("/checkLogged", methods=["GET"])
@jwt_required()
def check_logged():
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)

    if not user:
        return jsonify({"status": 401, "message": "Not Logged"}), 401

    return jsonify({
        "status": 200,
        "message": "Logged In",
        "user": {
            "email": user["email"],
            "name": user.get("name"),
            "avatar": user.get("avatar")
        }
    }), 200


@bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """ Refresh the JWT access token """
    identity = get_jwt_identity()
    new_access_token = create_access_token(identity=identity)
    return jsonify({"access_token": new_access_token})


@bp.route("/google-login", methods=["POST"])
def google_login():
    try:
        data = request.get_json()
        id_token_str = data.get("token")

        if not id_token_str:
            return jsonify({"message": "Missing token"}), 400

        try:
            credentials = id_token.verify_oauth2_token(
                id_token_str,
                Request(),
                "364205782321-tcdg1lfsn9psg8c6qft9pv1mlp9tv2j9.apps.googleusercontent.com"
            )
        except ValueError as e:
            return jsonify({"message": "Invalid token", "error": str(e)}), 401

        email = credentials.get("email")
        user = User.find_by_email(email)

        if not user:
            user_data = {
                "name": credentials.get("name", "Unknown User"),
                "email": email,
                "password": None,
                "bio": "",
                "status": "Available",
                "avatar": credentials.get("picture"),
            }
            # Add this method to the User class
            user_id = User.create_google_user(user_data)
            user = User.find_by_id(user_id)

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
