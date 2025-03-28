[![Watch the video](https://github.com/user-attachments/assets/f11091e8-2623-425d-8674-3a4a3eda8dd2)](https://youtu.be/RK4yPHXeOj4?si=_DqwSP-ceD7CAlue)
<br>
<p align="center">The greatest place of legal analysis tool Judge AI is an open-source system designed to enhance legal information retrieval by combining structured data extraction and conversational access. Utilising Natural Language Processing (NLP) and Large Language Models (LLMs), It extracts key information from legal case files into a structured format, enabling more accurate and efficient searches.</p>

![GitHub Repo stars](https://img.shields.io/github/stars/IAI-CAIR/judge-ai)
![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/IAI-CAIR/judge-ai)
![GitHub License](https://img.shields.io/github/license/IAI-CAIR/judge-ai)

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Benefits](#benefits)
4. [Directory Structure](#directory-structure)
5. [Getting Started](#getting-started)
6. [Usage](#usage)
7. [Evaluation Test Data](#evaluation-test-data)
8. [Contributing](#contributing)
9. [License](#license)
10. [Contact](#contact)

# Overview

**Judge AI (JAi)** is an **open-source project** dedicated to enhancing legal information retrieval. It achieves this by integrating **structured data extraction** with **conversational access** to legal documents . This system harnesses the power of **Natural Language Processing (NLP)** and **Large Language Models (LLMs)** to efficiently process legal case files. JAi aims to alleviate the challenges faced by legal professionals in navigating vast collections of unstructured legal documents . By providing a more efficient and accessible way to retrieve relevant legal information, JAi has the potential to optimise legal operations .

Have a look on our work: [Youtube Link](https://youtu.be/RK4yPHXeOj4?si=Lz7603zTUvGqS_AA)
# Features

- **Structured Extraction**: Converts legal documents into consistent JSON format using NLP and LLMs
- **Chat Interface**: Intuitive document upload and search capabilities
- **Smart Agent**: Vector-based conversational AI for queries and cross-case analysis
- **Research Efficiency**: Reduces manual effort in legal precedent identification
- **Open-Source**: Available on GitHub for community collaboration

# Benefits

- **Efficiency**: Automates document processing
- **Accuracy**: Ensures precise data retrieval
- **Simplicity**: Streamlines research via conversational access
- **Accessibility**: Simplifies complex legal information

# Directory Structure

```
├── LLM           # Language model components
├── backend       # Server-side logic
├── frontend      # User interface
├── LICENSE
└── README.md
```

# Getting Started

1. Clone repository:
   ```bash
   git clone https://github.com/pragyananda/judge-ai
   cd judge-ai
   ```

2. Frontend setup:
   ```bash
   cd frontend
   npm install
   ```

3. Backend setup:
   ```bash
   cd backend
   pip install -r requirements.txt
   echo "MONGO_URI=YOUR_MONGO_URI" > .env
   flask run
   ```

4. LLM setup:
   ```bash
   cd LLM
   source venv/bin/activate
   pip install -r requirements.txt
   # Follow Llama-cpp setup instructions
   ```

5. Configure frontend API:
   - Edit `frontend/src/api/api.js`: set `api = "YOUR_BACKEND_API_URL"`

## Usage

- Upload case files via chat interface
- Search within single or multiple documents
- Query the conversational agent
- Access structured JSON output

## Environment Variables

- `.env` (backend):
  ```
  MONGO_URI=YOUR_MONGO_URI
  ```
- `frontend/src/api/api.js`:
  ```
  api=YOUR_BACKEND_API_URL
  ```

# Evaluation 

The **evaluation data** folder in the **backend** repository contains valuable feedback from MCA Data Science students (Student 1 to Student 11) who participated in testing the Judge AI system. This folder includes both case files and conversational data, which help assess the system's performance and accuracy.

The evaluation data is structured as follows:

- **excel sheet**: This file contains detailed feedback provided by the students, including their reviews, ratings, and observations about the AI’s performance in understanding and processing legal cases.
  
- **casespdfs**: This folder contains various legal case documents in PDF format, which the students used to interact with the Judge AI system. These cases cover a range of legal topics and complexities, providing a comprehensive test for the tool’s capabilities.

- **conversations**: This folder holds chat logs between the students and the AI. Each conversation corresponds to a specific case in the **casespdfs** folder. The students queried the system and provided feedback on how accurately and efficiently it responded to their inquiries.

### evaluationFolder Structure

```
└── evaluation_data
    ├── sheet.xlsx         # Student feedback data
    ├── cases-pdfs            # Legal case PDFs
    └── conversations        # Student-AI chat logs
```
# Contributing

We welcome contributions! See the [contribution guidelines](https://github.com/pragyananda/judge-ai) for details.

# License

[MIT License](https://github.com/IAI-CAIR/judge-ai/blob/main/LICENSE) - See the LICENSE file for details.

# Contact

Open an issue or contact maintainers via GitHub: [IAI-CAIR/judge-ai](https://github.com/IAI-CAIR/judge-ai)

Join us in advancing AI for legal document processing!
