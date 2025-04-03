from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.prompts import ChatPromptTemplate
from langchain_community.embeddings import OllamaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
# import speech_recognition as sr
import pyttsx3
import os
import uuid
import json
import base64

app = Flask(__name__)
CORS(app)

os.environ["GOOGLE_API_KEY"] = "AIzaSyC9O_P4M9OFdofX5pl9Dzk0dSvBiD8dH9A"
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

PROMPT_TEMPLATE = """
Answer the question based only on the following context and provide response with proper formatting to be displayed in a webpage:

{context}

---

Answer the question based on the above context: {question}
"""

def get_pdf_text(pdf_docs):
    text = ""
    for pdf in pdf_docs:
        pdf_reader = PdfReader(pdf)
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=768, chunk_overlap=100)
    chunks = text_splitter.split_text(text)
    return chunks

# def get_vector_store(text_chunks):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    print("Generated embeddings for text chunks: ", embeddings)
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    # Serialize the FAISS index to bytes
    print(vector_store)
    faiss_bytes = vector_store.serialize_to_bytes()
    faiss_base64 = base64.b64encode(faiss_bytes).decode('utf-8')
    faiss_json = {
    "faiss_index": faiss_base64
    }
    faiss_json = json.loads(faiss_json)

    # Decode the Base64 string back to bytes
    faiss_bytes = base64.b64decode(faiss_json["faiss_index"])

    # Deserialize the bytes back to a FAISS object
    vector_store_deserialized = FAISS.deserialize_from_bytes(faiss_bytes)

    # Verify the deserialization
    print(vector_store_deserialized)
    return vector_store
def get_vector_store(text_chunks):
    # Define the embeddings
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    # Create a FAISS vector store
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    print(vector_store)
    # Serialize the FAISS index to bytes
    faiss_bytes = vector_store.serialize_to_bytes()
    faiss_base64 = base64.b64encode(faiss_bytes).decode('utf-8')

    # Create a JSON-compatible dictionary
    faiss_json = {
        "faiss_index": faiss_base64
    }

    # Convert dictionary to a JSON string
    faiss_json_str = json.dumps(faiss_json, indent=4)

    # Decode the Base64 string back to bytes
    faiss_bytes = base64.b64decode(faiss_json["faiss_index"])

    # Deserialize the bytes back to a FAISS object
    # Provide the embeddings used for the original FAISS index creation
    vector_store_deserialized = FAISS.deserialize_from_bytes(faiss_bytes, embeddings=embeddings,allow_dangerous_deserialization=True)
    print(vector_store_deserialized)
    vector_store_deserialized.save_local("faiss_index")
    # Return the deserialized vector store for further use
    return faiss_json_str

def ollama_llm(question, context):
    # llm = Ollama(model="llama3")
    llm=ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3)
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context, question=question)
    response = llm.invoke(prompt)
    response_text = response.content
    return response_text

def user_input(user_question):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    new_db = FAISS.load_local("faiss_index", embeddings,allow_dangerous_deserialization=True)
    print("question",user_question)
    docs = new_db.similarity_search_with_score(user_question)
    # print("context : ",docs)
    file_path = "output.txt"

    # Write the docs content and score to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        for doc, score in docs:
            file.write(f"Content: {doc.page_content}\n")
            file.write(f"Score: {score}\n\n")
    context = " ".join([doc[0].page_content for doc in docs])

    response = ollama_llm(user_question, context)

    return response, context

# def record_audio():
#     recognizer = sr.Recognizer()
#     mic = sr.Microphone()
#     with mic as source:
#         audio = recognizer.listen(source)
#     try:
#         query = recognizer.recognize_google(audio)
#         return query
#     except sr.UnknownValueError:
#         return "Could not understand audio"
#     except sr.RequestError:
#         return "Could not request results; check your network connection"

# def text_to_speech(text):
#     engine = pyttsx3.init()
#     engine.say(text)
#     engine.runAndWait()
#     return "Text to speech conversion complete"

@app.route('/upload_pdfs', methods=['POST'])
def upload_pdfs():
    pdf_files = request.files.getlist('pdf_files')
    if not pdf_files:
        return jsonify({"error": "No PDF files uploaded"}), 400

    raw_text = get_pdf_text(pdf_files)
    # print("Extracted raw text: ", raw_text)
    text_chunks = get_text_chunks(raw_text)
    # print("Generated text chunks: ", text_chunks)
    vector_store = get_vector_store(text_chunks)
    # print("Vector store: ", vector_store)
    # return jsonify({"message": "PDF files processed successfully"}), 200
    return jsonify({"message": "PDF files processed successfully", "embeddings": vector_store}), 200

    # print("Final embeddings: ", embeddings)

@app.route('/ask_question', methods=['POST'])
def ask_question():
    data = request.json
    question = data.get('question')
    session_id = data.get('session_id')
    if not question:
        return jsonify({"error": "No question provided"}), 400

    response, context = user_input(question)
    return jsonify({"response": response, "context": context, "session_id": session_id}), 200

# @app.route('/record_question', methods=['POST'])
# def record_question():
#     question = record_audio()
#     if "error" in question:
#         return jsonify({"error": question}), 400

#     session_id = str(uuid.uuid4())
#     response, context = user_input(question)
#     return jsonify({"response": response, "context": context, "session_id": session_id}), 200

# @app.route('/text_to_speech', methods=['POST'])
# def convert_text_to_speech():
#     data = request.json
#     text = data.get('text')
#     if not text:
#         return jsonify({"error": "No text provided"}), 400

#     response = text_to_speech(text)
#     return jsonify({"message": response}), 200

@app.route('/new_chat', methods=['POST'])
def new_chat():
    session_id = str(uuid.uuid4())
    return jsonify({"session_id": session_id}), 200

if __name__ == '__main__':
    app.run(debug=False)
