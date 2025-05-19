import React, { useState } from 'react';
import axios from 'axios';

const ModelUpload = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://127.0.0.1:5000/upload_model', formData)
      alert('Model uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file.');
    }
  };

  return (
    <div>
      <label>Select Model.json file</label>
      <input className="input_truth_label" type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload Model</button>
    </div>
  );
};

export default ModelUpload;