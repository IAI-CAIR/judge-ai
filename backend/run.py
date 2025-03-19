# from app import create_app
# from app.extensions import socketio  # Import socketio


# app = create_app()

# if __name__ != "__main__":  # Fix for Gunicorn
#     socketio.init_app(app)

# if __name__ == "__main__":
#     socketio.run(app, port=5000, debug=True, allow_unsafe_werkzeug=True)import eventlet
import eventlet.wsgi
from app import create_app
from app.extensions import socketio

# Ensure proper eventlet monkey patching for async networking
eventlet.monkey_patch()

app = create_app()

if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True, allow_unsafe_werkzeug=True)
else:
    # Gunicorn mode: Properly initialize SocketIO with async mode
    socketio.init_app(app, async_mode="eventlet", cors_allowed_origins="*", all_reconnects=True)
