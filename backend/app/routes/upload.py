from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..helpers.file_helpers import allowed_file, create_pdf_preview
from ..extensions import mongo, socketio
from flask_socketio import emit
from .data import get_excel_data
import os
from .chunking import process_and_get_chunks
import requests
import json
import csv
from datetime import datetime
import sys
import time
from bson import ObjectId 
from dotenv import load_dotenv
import os

load_dotenv()

LLM_URL = os.getenv("LLM_URL")
BASE_URL = os.getenv("BASE_URL")


bp = Blueprint("upload", __name__, url_prefix="/api")

@bp.route("/upload-pdf", methods=["POST"])
@jwt_required()
def upload_pdf():
    user_id = get_jwt_identity()

    if "pdf" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["pdf"]

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)
    book_name, file_extension = os.path.splitext(filename)  

    first_word = book_name.split(" ")[0] if book_name else "book"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    unique_folder_name = f"{first_word}$@${timestamp}"

    book_folder = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_folder_name)

    os.makedirs(book_folder, exist_ok=True)

    file_path = os.path.join(book_folder, filename)
    file.save(file_path)
    
    book_id = str(ObjectId())
    socketio.emit("upload_status", {"message": f"File {filename} uploaded successfully!","book_id": book_id})

    try:
        preview_filename = create_pdf_preview(file_path)
        preview_url = f"{unique_folder_name}/{preview_filename}"
        
    except Exception as e:
        print("Error generating preview image:", e)
        preview_url = "https://via.placeholder.com/150"
        
    socketio.emit("upload_status", {"message": "Processing PDF chunks...","book_id": book_id})


    chunks_with_sources = process_and_get_chunks(file_path, unique_folder_name, filename)

    def save_chunks_to_csv(chunks_with_sources, book_folder, book_name):
        output_file = os.path.join(book_folder, f"{book_name}.csv")  

        try:
            with open(output_file, mode="w", encoding="utf-8", newline="") as file:
                writer = csv.writer(file)
                writer.writerow(["Chunk ID", "Text Chunk", "Source URL"])  

                for chunk_id, chunk, source_url in chunks_with_sources:
                    writer.writerow([chunk_id, chunk, source_url])  

            print(f"✅ Chunks successfully saved to {output_file}")

        except Exception as e:
            print(f"❌ Error saving chunks to CSV: {e}")

    save_chunks_to_csv(chunks_with_sources, book_folder, book_name)
    
    socketio.emit("upload_status", {"message": "Chunks saved, sending to LLM...", "book_id": book_id})
    
    
    return send_chunks_to_llm(
        book_id,
        os.path.join(book_folder, f"{book_name}.csv"), 
        book_folder, book_name, user_id, filename, preview_url,file_path, unique_folder_name
    )

# ***************************************************** Send Chunks to the LLM *****************************************************



def send_chunks_to_llm(book_id, csv_file_path, book_folder, book_name, user_id, filename, preview_url, file_path, unique_folder_name):
    """ Sends CSV data as an SSE request and processes responses in real time. """
    csv_file_path = os.path.join(book_folder, f"{book_name}.csv")

    print("\n📤 Sending Chunks content to LLM for Processing:\n", csv_file_path)

    total_chunks_csv = 0
    with open(csv_file_path, "r", encoding="utf-8") as file:
        reader = csv.reader(file)
        next(reader)  
        total_chunks_csv = sum(1 for _ in reader)     

    socketio.emit("upload_status", {
        "message": f"Total {total_chunks_csv} chunks identified.",
        "total_chunks": total_chunks_csv,
        "progress": 0,
        "book_id": book_id
    })
    
    with open(csv_file_path, "r", encoding="utf-8") as file:
        csv_content = file.read()   
    
    data = {"supporting_data": csv_content}  
    headers = {"Content-Type": "application/json"}

    structured_data = []
    structured_data_filename = f"{book_name}_structured.json"
    structured_data_path = os.path.join(book_folder, structured_data_filename)

    try:
        response = requests.post(os.getenv("LLM_URL"), json=data, headers=headers, stream=True, timeout=30)

        if response.status_code == 200:
            print("✅ Model connection successful!")
            socketio.emit("upload_status", {"message": "✅ Model connection successful!","book_id": book_id})
        else:
            print(f"⚠️ Model connection failed: {response.status_code} - {response.text}")
            socketio.emit("upload_status", {"message": f"⚠️ Model connection failed: {response.status_code}","book_id": book_id})
            return jsonify({"error": "Failed to connect to the model"}), 500

    # except requests.exceptions.Timeout:
    #     print("⏳ Request to LLM timed out.")
    #     socketio.emit("progress_update", {"message": "⏳ Request to LLM timed out.", "progress": -1})

    # except requests.exceptions.ConnectionError:
    #     print("❌ Unable to reach LLM server.")
    #     socketio.emit("progress_update", {"message": "❌ Unable to reach LLM server.", "progress": -1})

    # except requests.exceptions.RequestException as e:
    #     print(f"❌ Unexpected error: {e}")
    #     socketio.emit("progress_update", {"message": f"❌ Unexpected error: {e}", "progress": -1})

        with open(structured_data_path, "w", encoding="utf-8") as json_file:
            json_file.write("[")  

            first_entry = True
            total_chunks = 0
            start_time = time.time()
            processed_chunks = 0
            
            print("\n📡 Waiting for response...\n")
            socketio.emit("progress_update", {"message": "Processing started...", "progress": 0,"book_id": book_id})

            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode("utf-8").replace("data: ", "").strip()
                    try:
                        print(f"📥 Model Response: {decoded_line}") 
                        socketio.emit("model_response", {"chunk": decoded_line},room=book_id)

                        chunk_response = json.loads(decoded_line)
                        structured_data.append(chunk_response)
                        total_chunks += 1  
                        processed_chunks += 1  

                        if not first_entry:
                            json_file.write(",\n")
                        first_entry = False

                        json.dump(chunk_response, json_file)
                        
                        progress_percent = int((processed_chunks / total_chunks_csv) * 100) if total_chunks_csv > 0 else 0

                        socketio.emit("progress_update", {
                            "message": f"Processing chunk {processed_chunks}/{total_chunks_csv}...",
                            "progress": progress_percent,
                            "book_id":book_id
                        })

                        sys.stdout.write(f"\r🚀 Received {total_chunks} chunks...")
                        sys.stdout.flush()

                    except json.JSONDecodeError:
                        print(f"{decoded_line}")

            json_file.write("]")

            end_time = time.time()
            print(f"\n✅ Done! Received {total_chunks} chunks in {end_time - start_time:.2f} seconds.")

            socketio.emit("progress_update", {
                "message": f"✅ Processing completed! Total {total_chunks} chunks processed.",
                "progress": 100,
                "book_id": book_id
            })

        print(f"✅ Structured data successfully saved to {structured_data_path}")

    except requests.exceptions.RequestException as e:
        socketio.emit("progress_update", {"message": "Error communicating with LLM", "progress": -1, "book_id": book_id})
        return jsonify({"error": f"Error communicating with LLM: {str(e)}"}), 500     
    try:
        
        upload_record = {
            "_id": book_id,
            "user_id": user_id,
            "filename": filename,
            "folder_name": unique_folder_name,
            "fileUrl":file_path,
            "upload_time": datetime.utcnow(),
            "preview_url": preview_url,
            "structured_data_path": structured_data_path  
        }

        result = mongo.db.uploads.insert_one(upload_record)
        print("✅ MongoDB record saved successfully:",book_id, result.inserted_id)
    
    except Exception as e:
        print(f"❌ Error inserting into MongoDB: {e}")
        socketio.emit("progress_update", {"message": "Database save failed", "progress": -1,"book_id": book_id})
        return jsonify({"error": "Failed to save data in the database"}), 500

    
    socketio.emit("completed", {
        "message": "✅ File processing & storage complete!",
        "progress": 100,
        "book_id": book_id
    })

    return jsonify({
        "message": "Structured data processed successfully",
        "book_id": book_id,
        "structured_data_path": structured_data_path,
        "book_name": book_name
    }), 200  

# --------------------------------------------------------------------Function for Data Routes----------------------------------------------------------------------

@bp.route("/uploads/<path:file_path>")
def serve_file(file_path):
    full_path = os.path.join(current_app.config["UPLOAD_FOLDER"], file_path)
    
    if not os.path.exists(full_path):
        return jsonify({"error": "File not found"}), 404
    
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path))

def serialize_document(doc):
    """Convert MongoDB ObjectId to string in a document"""
    doc["_id"] = str(doc["_id"])  

@bp.route("/upload-history", methods=["GET"])
@jwt_required()
def get_upload_history():
    user_id = get_jwt_identity()

    books = list(
        mongo.db.uploads.find(
            {"user_id": user_id},
            {"_id": 1,
             "filename": 1,
             "file_path":1,
             "folder_name": 1,
             "preview_url": 1,
             "upload_time": 1, 
             "structured_data": 1
            }
        )
    )
    for book in books:
        book["book_id"] = str(book["_id"])
        
        if "folder_name" in book and book["folder_name"]:
            book["fileUrl"] = f"{book['folder_name']}/{book['filename']}"
            
        if "preview_url" in book and book["preview_url"]:
            book["preview_url"] = f"{book['preview_url']}"
            
        
        if "structured_data_path" in book and book["structured_data_path"]:
            structured_data_filename = os.path.basename(book["structured_data_path"])
            book["structuredDataUrl"] = f"{os.getenv('BASE_URL')}{book['folder_name']}/{structured_data_filename}"
            
            

    return jsonify({"uploads": books}), 200