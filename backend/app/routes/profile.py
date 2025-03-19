from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User

bp = Blueprint("profile", __name__, url_prefix="/api")

@bp.route("/profile", methods=["GET", "PUT"])
@jwt_required()
def user_profile():
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        return jsonify({
            "name": user.get("name"),
            "email": user.get("email"),
            "bio": user.get("bio"),
            "status": user.get("status"),
            "avatar": user.get("avatar"),
        }), 200