# backend/app/queue/q.py
from redis import Redis
from rq import Queue

redis_connection = Redis(
    host="localhost",
    port="6379"
)

q = Queue(connection=redis_connection)