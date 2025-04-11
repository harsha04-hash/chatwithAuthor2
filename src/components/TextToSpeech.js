import React, { useState } from 'react';
import axios from 'axios';

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://chatbackend-ycuv.onrender.com/text_to_speech', { text });
      setMessage(res.data.message);
    } catch (error) {
      console.error('Error converting text to speech:', error);
    }
  };

  return (
    <div>
      <h2>Text to Speech</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Convert</button>
      </form>
      {message && <div>{message}</div>}
    </div>
  );
};

export default TextToSpeech;
