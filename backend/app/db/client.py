# app/db/client.py
from pymongo import AsyncMongoClient

mongo_client: AsyncMongoClient = AsyncMongoClient(
    "mongodb://admin:admin@localhost:27017")
