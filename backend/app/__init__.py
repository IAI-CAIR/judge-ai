from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import mongo, bcrypt, jwt, socketio
from .routes import auth, profile, upload, data
from .routes import file_routes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})
 

    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
  
    
    # Debugging MongoDB connection
    with app.app_context():
        print("MongoDB Instance:", mongo.db)  
    
    # Register blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(profile.bp)
    app.register_blueprint(upload.bp)
    app.register_blueprint(data.bp)
    app.register_blueprint(file_routes.file_bp)
  

    return app