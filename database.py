from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URL)
db = client["PIM"]

users_collection = db["users"]
complaints_collection = db["complaints"]
