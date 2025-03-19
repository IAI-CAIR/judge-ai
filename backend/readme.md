# Run this for remote execution (Only for me or testing)
flask run --host=192.168.1.12 --port=5000  --debug


# Flask Application Structure

This document describes the structure of the Flask application, outlining the purpose of each directory and file.

## Project Overview

The application is organized into a modular structure, promoting maintainability and scalability.  It handles user authentication, profile management, file uploads (specifically PDFs), data import/export (Excel), and utilizes JWT for secure authentication.

## Directory StructureMarkdown

# Flask Application Structure

This document describes the structure of the Flask application, outlining the purpose of each directory and file.

## Project Overview

The application is organized into a modular structure, promoting maintainability and scalability.  It handles user authentication, profile management, file uploads (specifically PDFs), data import/export (Excel), and utilizes JWT for secure authentication.

## Directory Structure
```
flask_app/
├── app/
│   ├── init.py       # App factory & extension initialization
│   ├── config.py         # Configuration settings
│   ├── routes/
│   │   ├── init.py     # Register Blueprints
│   │   ├── auth_routes.py   # Registration, Login, Google Login
│   │   ├── profile_routes.py # Profile management, avatar upload
│   │   ├── file_routes.py   # PDF upload, serve file, upload history
│   │   ├── data_routes.py   # Excel data import/export
│   ├── utils/
│   │   ├── init.py     # Utility initializations if needed
│   │   ├── helpers.py     # Email & file validation
│   │   ├── auth_helper.py   # JWT authentication helpers
│
├── Books/               # Uploaded files (PDFs, images)
│
├── requirements.txt       # Dependencies
├── run.py               # Entry point
└── .env                 # Environment variables
```


## File and Directory Descriptions

### `app/`

This directory contains the core application logic.

*   **`__init__.py`:**  This file serves as the application factory. It initializes the Flask app, loads configurations, initializes extensions (database, bcrypt, JWT), and registers blueprints.

*   **`config.py`:** This file holds the application's configuration settings, such as database URIs, secret keys, upload directories, etc. It typically loads these settings from environment variables or a `.env` file.

*   **`routes/`:** This directory contains the different route definitions for the application, organized by functionality.

    *   **`__init__.py`:** This file is responsible for importing and registering all the blueprints defined in the other route files.

    *   **`auth_routes.py`:** Defines routes related to user authentication, including registration, login, and potentially Google login integration.

    *   **`profile_routes.py`:** Contains routes for managing user profiles, such as updating profile information and handling avatar uploads.

    *   **`file_routes.py`:** Defines routes for handling file uploads, specifically PDFs.  This includes uploading files, serving files, and managing upload history.

    *   **`data_routes.py`:** Handles routes related to importing and exporting data in Excel format.

*   **`utils/`:** This directory houses utility functions and helpers used throughout the application.

    *   **`__init__.py`:**  Used for initializing any utility components if needed.

    *   **`helpers.py`:** Contains helper functions for common tasks, such as email validation and file validation.

    *   **`auth_helper.py`:** Provides helper functions specifically for JWT authentication, such as generating and verifying tokens.

### `Books/`

This directory is designated for storing uploaded files, primarily PDFs and images.

### `requirements.txt`

This file lists all the Python dependencies required for the application.  It is used for easy installation of the project's dependencies using `pip install -r requirements.txt`.

### `run.py`

This file serves as the entry point for running the Flask application.  It imports the `create_app` function from `app/__init__.py` and starts the Flask development server.

### `.env`

This file stores environment-specific variables, such as database credentials, API keys, and secret keys.  It is important to keep this file out of version control for security reasons.  The `python-dotenv` package is typically used to load these variables.

## Key Technologies

*   **Flask:** The web framework used for building the application.
*   **Flask-PyMongo:** For interacting with MongoDB.
*   **Flask-Bcrypt:** For password hashing.
*   **Flask-JWT-Extended:** For JWT-based authentication.
*   **python-dotenv:** For managing environment variables.
*   (Other libraries as needed, listed in `requirements.txt`)

This documentation provides a high-level overview of the application's structure.  More detail