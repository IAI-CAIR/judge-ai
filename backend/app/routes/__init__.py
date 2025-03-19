from flask import Blueprint

def register_blueprints(app):
    from .auth import auth_bp
    from .google_login_routes import google_login_bp
    from .profile import profile_bp
    from .file_routes import file_bp
    from .data_routes import data_bp
    from .data import excel_bp


    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(google_login_bp)
    app.register_blueprint(excel_bp)
