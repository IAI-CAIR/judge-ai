from flask_socketio import emit
from ..extensions import socketio
import time

@socketio.on('connect')
def handle_connect():
    print("Client connected!")
    emit('message', {'data': 'Connected to Flask-SocketIO'})


@socketio.on("start_process")
def start_process():
    """Simulate a real-time process that sends updates"""
    print("WebSocket event received: start_process")  # ✅ Debug log
    for page in range(1, 6):  # Simulate processing 5 pages
        time.sleep(2)  # Simulate a delay
        progress_data = {"page": page, "message": f"Processing page {page}..."}
        print(f"Sending progress update: {progress_data}")  # ✅ Debug log
        emit("progress_update", progress_data, broadcast=True)
    
    print("Sending completion event")  # ✅ Debug log
    emit("completed", {"message": "Processing complete!"}, broadcast=True)