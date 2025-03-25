from flask import Blueprint, jsonify, send_file, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
import pandas as pd
import io
from ..extensions import mongo


bp = Blueprint("data", __name__, url_prefix="/api")


@bp.route("/excel-data/<book_id>", methods=["GET"])
@jwt_required()
def get_excel_data(book_id):
    user_id = get_jwt_identity()
    print(f"Received request for Book ID: {book_id}, User ID: {user_id}")

    try:
        book_object_id = book_id
    except Exception as e:
        print("❌ Invalid ObjectId format:", e)
        return jsonify({"error": "Invalid book ID format"}), 400
    print("book object id", book_id)
    
    user_upload = mongo.db.uploads.find_one(
        {"_id": book_object_id, "user_id": user_id},
        {"_id": 0, "structured_data_path": 1}
    )

    print("MongoDB Query Result:", user_upload)

    if not user_upload:
        print("❌ Book not found in database!")
        return jsonify({"error": "Book not found"}), 404

    structured_data_path = user_upload.get("structured_data_path")
    
    if not structured_data_path:
        print("❌ No structured data path in database!")
        return jsonify({"error": "No structured data available"}), 404

    try:
        with open(structured_data_path, "r", encoding="utf-8") as json_file:
            structured_data = json.load(json_file)
        print("✅ Successfully loaded structured data!")
        return jsonify({"data": structured_data}), 200
    except FileNotFoundError:
        print("❌ Structured data file not found at:", structured_data_path)
        return jsonify({"error": "Structured data file not found"}), 404
    except json.JSONDecodeError:
        print("❌ Error decoding JSON data!")
        return jsonify({"error": "Error decoding structured data"}), 500


@bp.route("/export-excel", methods=["GET"])
@jwt_required()
def export_excel():
    user_id = get_jwt_identity()
    book_id = request.args.get("bookId")
    print(f"Received request for Book ID: {book_id}")

    if not book_id:
        return jsonify({"error": "Book ID is required"}), 400
    else:
        book_id = book_id 
    user_upload = mongo.db.uploads.find_one(
        {"user_id": user_id, "_id": book_id}, 
        {"structured_data_path": 1, "filename": 1}
    )
    if not user_upload:
        return jsonify({"error": "No structured data found"}), 404

    structured_data_path = user_upload.get("structured_data_path")
    original_filename = user_upload.get("filename", "structured_data")  # Default if missing

    if not structured_data_path or not os.path.exists(structured_data_path):
        return jsonify({"error": "Structured data file not found"}), 404

    # Load structured data from JSON
    with open(structured_data_path, "r", encoding="utf-8") as json_file:
        structured_data = json.load(json_file)
# Process data into a structured format
    extracted_rows = []
    
    for entry in structured_data:
        # print("Entry:", entry)
        chunk_id = entry.get("Chunk ID")
        source_url = entry.get("Source URL")
        result_data = entry.get("Result")
        if not result_data or result_data.strip() == "":
            parsed_result = {}
        else:
            try:
                parsed_result = json.loads(result_data)
                if not isinstance(parsed_result, dict):  
                    parsed_result = {}  # Ensure parsed_result is a dict
            except json.JSONDecodeError:
                parsed_result = {}
        events = parsed_result.get("Events", [])

        if not events:
            # If no events exist, fill everything with "N/A"
            extracted_rows.append({
                "Chunk ID": chunk_id,
                "Source URL": source_url,
                "Event Name": "N/A",
                "Description": "N/A",
                "Participants": "N/A",
                "Location": "N/A",
                "Start Date": "N/A",
                "End Time": "N/A",
                "Key Details": "N/A",
                "Day": "N/A",
                "Month": "N/A",
                "Year": "N/A",
                "General Comments": "N/A"
            })
        else:
            for event in events:
                extracted_rows.append({
                    "Chunk ID": chunk_id,
                    "Source URL": source_url,
                    "Event Name": event.get("Event Name", "N/A"),
                    "Description": event.get("Description", "N/A"),
                    "Participants": ", ".join(event.get("Participants/People", [])) if event.get("Participants/People") else "N/A",
                    "Location": event.get("Location/Place", "N/A"),
                    "Start Date": event.get("Start Date", "N/A"),
                    "End Time": event.get("End Time", "N/A"),
                    "Key Details": event.get("Key Details", "N/A"),
                    "Day": event.get("Day", "N/A"),
                    "Month": event.get("Month", "N/A"),
                    "Year": event.get("Year", "N/A"),
                    "General Comments": event.get("General Comments", "N/A")
                })

    # Convert to DataFrame
    # print("Extracted Rows:", extracted_rows)
    df = pd.DataFrame(extracted_rows)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Structured Data")

    output.seek(0)

    # Extract filename without extension and append .xlsx
    excel_filename = f"{os.path.splitext(original_filename)[0]}.xlsx"

    return send_file(output, as_attachment=True, download_name=excel_filename)

