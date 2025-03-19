from flask_jwt_extended import create_access_token, get_jwt_identity
from bson.objectid import ObjectId
from app import mongo


def generate_token(user_id):
    """Generate JWT token."""
    return create_access_token(identity=str(user_id))


def get_current_user():
    """Fetch current user object from JWT token."""
    user_id = get_jwt_identity()
    return mongo.db.users.find_one({"_id": ObjectId(user_id)})
