from app import create_app
from app.extensions import socketio  # Import socketio


app = create_app()

if __name__ == "__main__":
    socketio.run(app, port=5000, debug=True, allow_unsafe_werkzeug=True)
