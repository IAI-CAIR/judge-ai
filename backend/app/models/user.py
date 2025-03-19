from ..extensions import mongo, bcrypt
from bson.objectid import ObjectId

class User:
    def __init__(self, user_data):
        self.user_data = user_data
    
    @staticmethod
    def create(name, email, password):
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        user_data = {
            "name": name,
            "email": email,
            "password": hashed_password,
            "bio": "",
            "status": "Available",
            "avatar": None,
        }
        return mongo.db.users.insert_one(user_data)
    
    @staticmethod
    def find_by_email(email):
        return mongo.db.users.find_one({"email": email})
    
    @staticmethod
    def find_by_id(user_id):
        return mongo.db.users.find_one({"_id": ObjectId(user_id)})
    
    @staticmethod
    def create_google_user(user_data):
        result = mongo.db.users.insert_one(user_data)
        return str(result.inserted_id)