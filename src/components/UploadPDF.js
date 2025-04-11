import React, { useState } from 'react';
import axios from 'axios';
import pdficon from '../assets/pdf4.png';

const UploadPDF = ({ saveFileNames, saveEmbeddingsToIndexedDB, fileNames }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
    setUploadedFiles(Array.from(event.target.files));
  };

  const handleUpload = async () => {
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('pdf_files', selectedFiles[i]);
    }

    setIsLoading(true); // Start loading
    try {
      const response = await axios.post('https://chatbackend-ycuv.onrender.com/upload_pdfs', formData);
      
      // Save file names
      saveFileNames(uploadedFiles.map(file => file.name));
      
      // Save embeddings
      if (response.data && response.data.embeddings) {
        saveEmbeddingsToIndexedDB(response.data.embeddings);
      }
      
      // Clear the selected files state after a successful upload
      setSelectedFiles([]);
      setUploadedFiles([]);  // Clear the uploaded files state
    } catch (error) {
      console.error('Error uploading PDFs:', error);
      alert('Failed to upload PDFs. Please try again later.');
    } finally {
      setIsLoading(false); // End loading
    }
  };

  return (
    <div>
      <div className="upload-container">
        <label className="file-label">
          Choose Files
          <input type="file" multiple className="file-input" onChange={handleFileChange} />
        </label>
        <button className="upload-btn" onClick={handleUpload} disabled={isLoading}>
          {isLoading ? (
            <div className="dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          ) : (
            'Upload PDFs'
          )}
        </button>
      </div>
      <div className="file-lists">
        {selectedFiles.length > 0 && (
          <div className="file-names">
            <strong>Selected Files:</strong>
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-name">
                <img className='pdfimg' src={pdficon} alt="PDF Icon" />
                {file.name}
              </div>
            ))}
          </div>
        )}
        {fileNames.length > 0 && (
          <div className="file-names">
            <strong>Uploaded Files:</strong>
            {fileNames.map((fileName, index) => (
              <div key={index} className="file-name">
                <img className='pdfimg' src={pdficon} alt="PDF Icon" />
                {fileName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPDF;
