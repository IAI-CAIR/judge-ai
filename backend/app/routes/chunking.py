import fitz  # PyMuPDF
from typing import List, Tuple
from flair.splitter import SegtokSentenceSplitter
from ..extensions import socketio  # Import SocketIO instance


def extract_text_with_pages(file_path: str) -> List[Tuple[str, int]]:
    """
    Extracts text from a PDF and returns a list of (text, page_number).
    """
    doc = fitz.open(file_path)
    text_with_pages = []

    for page_num, page in enumerate(doc, start=1):  # Pages are 1-indexed
        text = page.get_text("text").strip()
        if text:  # Avoid empty pages
            text_with_pages.append((text, page_num))

    return text_with_pages

def semantic_splitter(text: str, chunk_size: int = 1000) -> List[str]:
    """
    Splits text into meaningful chunks while maintaining context.
    """
    splitter = SegtokSentenceSplitter()
    sentences = splitter.split(text)

    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence_text = sentence.to_plain_string()
        if len(current_chunk) + len(sentence_text) <= chunk_size:
            current_chunk += " " + sentence_text
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence_text

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def process_and_get_chunks(file_path: str, unique_folder: str, filename: str) -> List[Tuple[int, str, str]]:
    """
    Extracts text with pages, splits it into chunks, and returns a list of (Chunk ID, chunk, Source URL with page).
    """
    try:
        text_with_pages = extract_text_with_pages(file_path)
        chunks_with_sources = []
        chunk_id = 1  # Start chunk ID from 1

         
        
        for text, page_num in text_with_pages:
            chunks = semantic_splitter(text)
            page_url = f"{unique_folder}/{filename}#page={page_num}"  # Append page number to URL

            for chunk in chunks:
                chunks_with_sources.append((chunk_id, chunk, page_url))
                               
                
                socketio.emit("progress_update", {
                    "chunk_id": chunk_id,
                    "page_number": page_num,
                    "message": f"Chunk {chunk_id} extracted from page {page_num}"
                })

                chunk_id += 1  
                
        socketio.emit("completed", {"message": "Chunk extracted and saved successfully!"})
        return chunks_with_sources
    

    except Exception as e:
        print(f"❌ Error processing chunks for {file_path}: {e}")
        return []
 