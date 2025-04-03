import React, { useState } from 'react';
import axios from 'axios';
import sendBtn from '../assets/send.svg';

const AskQuestion = ({ sessionId, saveChat, addQuestionToChat, fetchEmbeddings }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion('');

    setLoading(true);

    const tempChat = { sessionId, question: currentQuestion, response: 'Loading...' };
    addQuestionToChat(tempChat);

    try {
      const embeddings = await fetchEmbeddings();
      const res = await axios.post('http://127.0.0.1:5000/ask_question', {
        question: currentQuestion,
        session_id: sessionId,
        embeddings: embeddings,
      });

      saveChat({ question: currentQuestion, response: res.data.response });
      addQuestionToChat({ sessionId, question: currentQuestion, response: res.data.response }, true);
    } catch (error) {
      console.error('Error asking question:', error);
      addQuestionToChat({ sessionId, question: currentQuestion, response: 'Error fetching response' }, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatFooter">
      <div className="inp">
        <input type="text" value={question} onChange={handleQuestionChange} placeholder="Ask a question" />
        <button className="send" onClick={handleAsk} disabled={loading}>
          {loading ? <div className="spinner"></div> : <img src={sendBtn} alt="Send" />}
        </button>
      </div>
      <br />
    </div>
  );
};

export default AskQuestion;
