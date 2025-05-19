import React, { useState } from 'react';
import axios from 'axios';
import "./ImageUpload.css";


const ImageUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
        alert("No files selected!");
        return;
    }

    // Split selectedFiles into two halves
    const midIndex = Math.ceil(selectedFiles.length / 2);
    const firstHalf = Array.from(selectedFiles).slice(0, midIndex);
    const secondHalf = Array.from(selectedFiles).slice(midIndex, selectedFiles.length);

    const uploadChunk = async (fileChunk) => {
        const formData = new FormData();
        fileChunk.forEach(file => formData.append("images", file));

        await axios.post("http://127.0.0.1:5000/uploads_images", formData);
    };

    const uploadChunkTwo = async (fileChunk) => {
      const formData = new FormData();
      fileChunk.forEach(file => formData.append("images", file));

      await axios.post("http://127.0.0.1:5000/uploads_images_two", formData);
    };
    try {
        // Upload the first half
        await uploadChunk(firstHalf);
        console.log("First half uploaded successfully!");

        await new Promise(resolve => setTimeout(resolve, 500));
        // Upload the second half
        await uploadChunkTwo(secondHalf);
        console.log("Second half uploaded successfully!");

        alert("All images uploaded successfully!");
        setSelectedFiles(null); // Clear selection after successful upload

    } catch (error) {
        console.error("Error uploading images:", error);
        alert("Error uploading images.");
    }
};

  // const handleUpload = async () => {
  //   const formData = new FormData();
  //   for (const file of selectedFiles) {
  //     formData.append("images", file);
  //   }

  //   try {
  //     await axios.post("http://127.0.0.1:5000/uploads_images", formData);
  //     alert("Images uploaded successfully!");
  //     setSelectedFiles(null); // Clear selection after successful upload
  //   } catch (error) {
  //     console.error("Error uploading images:", error);
  //     alert("Error uploading images.");
  //   }
  // };

  return (
    <div className="upload-container">
      <label htmlFor="folderInput" className="label">
        Select a data folder
      </label>
      <input
        id="folderInput"
        className="input-data"
        type="file"
        multiple
        onChange={handleFileChange}
      />
      <button
        className="upload-button"
        onClick={handleUpload}
        disabled={!selectedFiles}
      >
        Upload Images
      </button>
    </div>
  );
};


export default ImageUpload;