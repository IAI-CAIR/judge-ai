from flask import Flask, request, jsonify,Response
from llama_cpp import Llama
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableLambda
import threading
import json
from json_repair import repair_json
import re
import csv 
import os
import pandas as pd
import io
import time



# Path to your local GGUF model
model_path = "model/llama-chat-3.1-q8.gguf"
BOOK_UPLOAD_FOLDER = "backend/app/uploads"

app = Flask(__name__)


class LlamaSingleton:
    _instances = {}
    _lock = threading.Lock()  # Ensures thread safety

    @classmethod
    def get_instance(cls, llm_name):
        """ Get a singleton instance of Llama model """
        with cls._lock:
            if llm_name not in cls._instances:
                try:
                    from llama_cpp import Llama
                except ImportError:
                    raise ImportError("Please install llama_cpp using: pip install llama-cpp-python")
                
                try:
                    cls._instances[llm_name] = Llama(
                        model_path=llm_name, 
                        n_gpu_layers=50,  # Adjust for better GPU performance
                        n_batch=512, 
                        n_ctx=4000, 
                        verbose=True
                    )
                except Exception as e:
                    raise RuntimeError(f"Error loading model: {e}")
                
            return cls._instances[llm_name]

    @classmethod
    def query_model(cls, llm, prompt, **kwargs):
        """ Run a query on the model """
        with cls._lock:
            return llm(prompt, **kwargs)

# Load the Llama model
llm_name = model_path
llm = LlamaSingleton.get_instance(llm_name)

# Improved prompt template
prompt = PromptTemplate(
    input_variables=["supporting_data"],  
    template="""
    [INST] <<SYS>>
    You are a highly precise AI that extracts key information from the given text while ensuring a structured, meaningful, and non-empty output.

    Your task is to process the following supporting data and extract all key events in a well-structured JSON format. If no events are found, provide a meaningful "General Comments" field explaining why.
    <</SYS>>

    **Supporting Data:**
    --------------------
    {supporting_data}
    --------------------

    **Your Output Must Follow This Strict JSON Structure:**
    
    ```json
    {{
        "Events": [ 
            {{
                "Event Name": "string",
                "Description": "Event [Event Name] held by [Person] at [Place], located at [Location] on [Date] at [Time]. [Fact or figure related to the event, such as the number of participants, key outcomes, or other important details].",
                "Participants/People": ["name1", "name2", ...],
                "Location/Place": "string",
                "Start Date": "string",
                "End Time": "string",
                "Key Details": "string",
                "Day": "string", 
                "Month": "string", 
                "Year": "string",
                "General Comments": "string"
            }}
            ,
            ...,
            ...
        ]
       
    }}
    ```
    - **Strict Deduplication Rules**:
      - Merge all occurrences of the same event into a single entry.
      - Ensure participant lists are combined without duplicates.
      - If date, time, or location details vary across duplicate entries, prioritize the most frequently mentioned ones.
      - If key details conflict, use contextual judgment to determine the most accurate version.
      
    - **STRICT RULES:**
      - Return ONLY JSON (no explanations).
      - Merge duplicate events.
      - If any field is missing, use `null`.
      
    **Output must be a valid JSON object. Do not return explanations, extra text, or formatting outside the JSON.**
    [/INST]
    """
)


def heal_json(json_str):
    """Attempts to repair broken JSON output."""
    try:
        fixed_json_str = re.sub(r"```json\n(.*)\n```", r"\1", json_str, flags=re.DOTALL)
        fixed_json_str = re.sub(r',?\n(\s*)(?=")', r",\n\1", fixed_json_str)
        fixed_json_str = re.sub(r"}\n(\s*){", r"},\n\1{", fixed_json_str)
        fixed_json_str = re.sub(r"([{\[]),", r"\1", fixed_json_str)
        fixed_json = repair_json(fixed_json_str)
        return fixed_json
    except Exception as e:
        print("Error repairing JSON:", e)
        return json_str  

# Function to format prompt and run the model
def format_prompt_and_run(inputs):
    """ Formats the prompt and queries the model """
    try:
        # Validate input
        if "supporting_data" not in inputs:
            raise ValueError("Missing required input: 'supporting_data'")

        formatted_prompt = prompt.format(**inputs)
        
        response = llm(formatted_prompt, max_tokens=4000)

        # Debug: Print the raw model response
        extracted_text = response['choices'][0]['text']
        print("\n🔍 Raw Model Response:-------------------------------------------",extracted_text)
        if isinstance(response, str):
            try:
                json_output = json.loads(response)
                return json_output
            except json.JSONDecodeError:
                repaired_output = heal_json(response) 
                return json.loads(repaired_output)

        elif isinstance(response, dict) and "choices" in response:
            extracted_text = response['choices'][0]['text']
            try:
                repaired_output = heal_json(extracted_text)
                return repaired_output
            except json.JSONDecodeError:
                repaired_output = heal_json(extracted_text)
                return repaired_output
        else:
            return {"error": "Unexpected response format from the model"}

    except Exception as e:
        return {"error": str(e)}

def process_csv_row(row):
    """Processes a single row and returns JSON response."""
    chunk_id = row.get("Chunk ID", None)
    text_chunk = row.get("Text Chunk", "").strip()
    source_url = row.get("Source URL", "")

    if not text_chunk:
        print(f"⚠️ Skipping empty Chunk ID: {chunk_id}")
        return None  # Skip empty rows

    print(f"\n🟢 Processing Chunk ID: {chunk_id} and {source_url}")
    
    payload = {"supporting_data": text_chunk}
    print(f"📤 Sending Payload: {payload}")

    chain = RunnableLambda(format_prompt_and_run)
    response = chain.invoke(payload)

    return {
        "Chunk ID": chunk_id,
        "Source URL": source_url,
        "Result": response
    }

def stream_csv_rows(csv_content):
    """Generator function to process CSV row-by-row and stream responses."""
    try:
        df = pd.read_csv(io.StringIO(csv_content))
        print(f"✅ CSV Loaded Successfully! Total Rows: {len(df)}")

        for _, row in df.iterrows():
            chunk_response = process_csv_row(row)
            if chunk_response:
                yield f"data: {json.dumps(chunk_response)}\n\n"  # SSE format
                time.sleep(0.1)  # Small delay for smoother streaming

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route("/generate", methods=["POST"])
def generate_text():
    """API Endpoint: Streams JSON responses row by row as they are processed."""
    data = request.get_json()
    csv_content = data.get("supporting_data", "")

    if not csv_content:
        return jsonify({"error": "Invalid or missing 'supporting_data'"}), 400

    return Response(stream_csv_rows(csv_content), content_type="text/event-stream")


if __name__ == "__main__":
    app.run(port=5001, debug=True) 