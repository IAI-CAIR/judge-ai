from ..extensions import mongo,bcrypt
from bson.objectid import ObjectId


class StructuredData:
    @staticmethod
    def get_all():
        return list(mongo.db["structured-data"].find({}, {"_id": 0}))
