import React, { useState } from 'react';
import axios from 'axios';
import './TruthUpload.css'

const TruthUpload = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files);
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    for (const f of file){
      formData.append('file', f);
    }

    try {
      await axios.post('http://127.0.0.1:5000/uploads_truth', formData)
      alert('File uploaded successfully!');
      setFile(null);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file.');
    }
  };

  return (
    <div className="upload-container">
      <label htmlFor="folderInput" className="label">
        Select truth.json file
      </label>
      <input
        id="folderInput"
        className="input-data"
        type="file"
        onChange={handleFileChange}
      />
      <button
        className="upload-button"
        onClick={handleFileUpload}
        disabled={!file}
      >
        Upload Truth.json
      </button>
    </div>
  );
};

export default TruthUpload;