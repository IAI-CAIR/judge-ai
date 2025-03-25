from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..helpers.file_helpers import allowed_file, create_pdf_preview
from ..extensions import mongo, socketio
from flask_socketio import emit
from .data import get_excel_data
import os
import datetime
from .chunking import process_and_get_chunks
import requests
import json
import csv
from datetime import datetime
import json
import sys
import time
from bson import ObjectId 




LLM_URL = "http://192.168.1.104:5001/generate/local"
BASE_URL = "http://192.168.1.12:5000/api/uploads/"

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

    first_word = book_name.split()[0] if book_name else "book"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    unique_folder_name = f"{first_word}$@${timestamp}"

    book_folder = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_folder_name)

    os.makedirs(book_folder, exist_ok=True)

    file_path = os.path.join(book_folder, filename)
    file.save(file_path)
    
    socketio.emit("progress_update", {"message": f"File {filename} uploaded successfully!"})

    try:
        preview_filename = create_pdf_preview(file_path)
        preview_path = f"{unique_folder_name}/{preview_filename}"
        preview_url = preview_path
    except Exception as e:
        print("Error generating preview image:", e)
        preview_url = "https://via.placeholder.com/150"
        
    socketio.emit("progress_update", {"message": "Processing PDF chunks..."})


    # Extract and process chunks
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
    
    socketio.emit("progress_update", {"message": "Chunks saved, sending to LLM..."})
    
    
    return send_chunks_to_llm(
        os.path.join(book_folder, f"{book_name}.csv"), 
        book_folder, book_name, user_id, filename, preview_url, unique_folder_name
    )

# -----------------------------------------------------Send Chunks to the LLM one by one------------------------------------------------



def send_chunks_to_llm(csv_file_path, book_folder, book_name, user_id, filename, preview_url, unique_folder_name):
    """ Sends CSV data as an SSE request and processes responses in real time. """
    csv_file_path = os.path.join(book_folder, f"{book_name}.csv")

    print("\n📤 Sending Chunks content to LLM for Processing:\n", csv_file_path)

    total_chunks_csv = 0
    with open(csv_file_path, "r", encoding="utf-8") as file:
        reader = csv.reader(file)
        next(reader)  # Skip header row
        total_chunks_csv = sum(1 for _ in reader)     

    # ✅ STEP 2: Emit Total Chunks Count to WebSocket
    socketio.emit("progress_update", {
        "message": f"Total {total_chunks_csv} chunks identified.",
        "total_chunks": total_chunks_csv,
        "progress": 0
    })
    
    # ✅ **STEP 3: Send Chunks to LLM & Emit Real-time Progress**
    with open(csv_file_path, "r", encoding="utf-8") as file:
        csv_content = file.read()   
    
    data = {"supporting_data": csv_content}  
    headers = {"Content-Type": "application/json","x-api-key": "qwerty"}

    structured_data = []
    structured_data_filename = f"{book_name}_structured.json"
    structured_data_path = os.path.join(book_folder, structured_data_filename)

    try:
        response = requests.post(LLM_URL, json=data, headers=headers, stream=True, timeout=30)
        print("✅ LLM connection successful!",response)
        if response.status_code == 200:
            print("✅ Model connection successful!")
            socketio.emit("progress_update", {"message": "✅ Model connection successful!"})
        else:
            print(f"⚠️ Model connection failed: {response.status_code} - {response.text}")
            socketio.emit("progress_update", {"message": f"⚠️ Model connection failed: {response.status_code}"})
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
            total_chunks = 0  # ✅ Track number of received chunks
            start_time = time.time()  # ✅ Track time
            processed_chunks = 0
            
            print("\n📡 Waiting for response...\n")
            socketio.emit("progress_update", {"message": "Processing started...", "progress": 0})

            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode("utf-8").replace("data: ", "").strip()
                    try:
                        print(f"📥 Model Response: {decoded_line}")  # ✅ Log every received response
                        socketio.emit("model_response", {"chunk": decoded_line})  # ✅ Emit each response to frontend

                        chunk_response = json.loads(decoded_line)
                        structured_data.append(chunk_response)
                        total_chunks += 1  
                        processed_chunks += 1  

                        if not first_entry:
                            json_file.write(",\n")
                        first_entry = False

                        json.dump(chunk_response, json_file)
                        
                        progress_percent = int((processed_chunks / total_chunks_csv) * 100) if total_chunks_csv > 0 else 0



                        # ✅ Emit Real-Time Progress to UI
                        socketio.emit("progress_update", {
                            "message": f"Processing chunk {processed_chunks}/{total_chunks_csv}...",
                            "progress": progress_percent
                        })

                        sys.stdout.write(f"\r🚀 Received {total_chunks} chunks...")
                        sys.stdout.flush()

                    except json.JSONDecodeError:
                        print(f"\n❌ Error decoding JSON: {decoded_line}")

            json_file.write("]")  # Close JSON array

            end_time = time.time()  # ✅ Capture end time
            print(f"\n✅ Done! Received {total_chunks} chunks in {end_time - start_time:.2f} seconds.")

            socketio.emit("progress_update", {
                "message": f"✅ Processing completed! Total {total_chunks} chunks processed.",
                "progress": 100
            })

        print(f"✅ Structured data successfully saved to {structured_data_path}")

    except requests.exceptions.RequestException as e:
        socketio.emit("progress_update", {"message": "Error communicating with LLM", "progress": -1})
        return jsonify({"error": f"Error communicating with LLM: {str(e)}"}), 500     

    # ✅ NOW Save Record to MongoDB (AFTER JSON is fully written)
    try:
        book_id = str(ObjectId())
        upload_record = {
            "_id": book_id,
            "user_id": user_id,
            "filename": filename,
            "folder_name": unique_folder_name,
            "upload_time": datetime.utcnow(),
            "preview_url": preview_url,
            "structured_data_path": structured_data_path  
        }

        result = mongo.db.uploads.insert_one(upload_record)  # ✅ Fix: Execute MongoDB insert
        print("✅ MongoDB record saved successfully:", result.inserted_id)
    
    except Exception as e:
        print(f"❌ Error inserting into MongoDB: {e}")
        socketio.emit("progress_update", {"message": "Database save failed", "progress": -1})
        return jsonify({"error": "Failed to save data in the database"}), 500

    # ✅ Notify UI that everything is completed
    socketio.emit("progress_update", {
        "message": "✅ File processing & storage complete!",
        "progress": 100
    })

    return jsonify({
        "message": "Structured data processed successfully",
        "book_id": book_id,
        "structured_data_path": structured_data_path,
        "book_name": book_name
    }), 200  

# --------------------------------------------------------------------Function for Data Routes----------------------------------------------------------------------
    # structured_data_response = get_excel_data()
    # return structured_data_response 


@bp.route("/uploads/<path:file_path>")
def serve_file(file_path):
    full_path = os.path.join(current_app.config["UPLOAD_FOLDER"], file_path)
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path))

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
            book["fileUrl"] = f"{BASE_URL}{book['folder_name']}/{book['filename']}"
            
        if "preview_url" in book and book["preview_url"]:
            book["preview_url"] = f"{BASE_URL}{book['preview_url']}"
            
        
        if "structured_data_path" in book and book["structured_data_path"]:
            structured_data_filename = os.path.basename(book["structured_data_path"])
            book["structuredDataUrl"] = f"{BASE_URL}{book['folder_name']}/{structured_data_filename}"
            
            

    return jsonify({"uploads": books}), 200