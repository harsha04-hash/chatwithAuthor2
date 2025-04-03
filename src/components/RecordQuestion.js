import React, { useState } from 'react';
import { ReactMic } from 'react-mic';
import axios from 'axios';

const RecordQuestion = () => {
  const [record, setRecord] = useState(false);
  const [response, setResponse] = useState('');

  const startRecording = () => {
    setRecord(true);
  };

  const stopRecording = () => {
    setRecord(false);
  };

  const onStop = async (recordedBlob) => {
    const formData = new FormData();
    formData.append('audio', recordedBlob.blob);
    try {
      const res = await axios.post('http://127.0.0.1:5000/record_question', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResponse(res.data.response);
    } catch (error) {
      console.error('Error recording question:', error);
    }
  };

  return (
    <div>
      <h2>Record a Question</h2>
      <button onClick={startRecording} disabled={record}>Start</button>
      <button onClick={stopRecording} disabled={!record}>Stop</button>
      <ReactMic
        record={record}
        className="sound-wave"
        onStop={onStop}
        mimeType="audio/wav"
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />
      {response && <div><strong>Response:</strong> {response}</div>}
    </div>
  );
};

export default RecordQuestion;
