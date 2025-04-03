import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { openDB } from 'idb';
import UploadPDF from './components/UploadPDF';
import AskQuestion from './components/AskQuestion';
import './App.css';
import gptLogo from './assets/cwa1.png';
import addBtn from './assets/add-30.png';
import msgIcon from './assets/message.svg';
import userIcon from './assets/user2.png';
import gptImgLogo from './assets/gptimg1.png';

// Initialize IndexedDB
const initDB = async () => {
  const db = await openDB('chatAppDB', 1, {
    upgrade(db) {
      const embeddingsStore = db.createObjectStore('embeddings', { keyPath: 'sessionId' });
      embeddingsStore.createIndex('timestamp', 'timestamp');

      const chatsStore = db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
      chatsStore.createIndex('sessionIdIndex', 'sessionId');

      const filesStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      filesStore.createIndex('sessionIdIndex', 'sessionId');
    },
  });
  return db;
};

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [db, setDb] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [chatName, setChatName] = useState('');
  // const [storedEmbeddings, setStoredEmbeddings] = useState(null);

  useEffect(() => {
    const setupDB = async () => {
      const dbInstance = await initDB();
      setDb(dbInstance);

      const storedSessionId = localStorage.getItem('session_id');
      if (storedSessionId) {
        setSessionId(storedSessionId);
      }

      const sessions = await dbInstance.getAllFromIndex('embeddings', 'timestamp');
      setAvailableSessions(sessions.reverse().map(s => s.sessionId));
      if (sessionId) {
        const storedChats = await dbInstance.getAllFromIndex('chats', 'sessionIdIndex', sessionId);
        setPreviousChats(storedChats);
        console.log('Loaded previous chats:', storedChats);

        const storedEmbeddings = await dbInstance.get('embeddings', sessionId);
        if (storedEmbeddings) {
          // setStoredEmbeddings(storedEmbeddings.embeddings);
          console.log('Loaded embeddings for session:', sessionId);
        }

        const storedFiles = await dbInstance.getAllFromIndex('files', 'sessionIdIndex', sessionId);
        setFileNames(storedFiles.map(file => file.name));
        console.log('Loaded file names for session:', sessionId);
        console.log(sessions);
        if (sessions.length > 0) {
          setChatName(`Chat ${availableSessions.length - availableSessions.indexOf(sessionId)}`);
        } 
        
      }
    };
    setupDB();
  }, [sessionId]);

  const saveEmbeddingsToIndexedDB = async (embeddings) => {
    if (db && sessionId) {
      console.log("Saving new embeddings for session:", sessionId);
      await db.put('embeddings', { sessionId, embeddings, timestamp: Date.now() });
    }
  };

  const saveChatToIndexedDB = async (chat) => {
    if (db && sessionId) {
      chat.sessionId = sessionId;
      await db.add('chats', chat);
      const updatedChats = await db.getAllFromIndex('chats', 'sessionIdIndex', sessionId);
      setPreviousChats(updatedChats);

      if (updatedChats.length === 1) {
        setChatName(`Chat ${availableSessions.length - availableSessions.indexOf(sessionId)}`);
      }
    }
  };

  const saveFileNamesToIndexedDB = async (fileNames) => {
    if (db && sessionId) {
      console.log("Saving new file names for session:", sessionId);
      for (let name of fileNames) {
        await db.add('files', { sessionId, name });
      }
      const storedFiles = await db.getAllFromIndex('files', 'sessionIdIndex', sessionId);
      setFileNames(storedFiles.map(file => file.name));
    }
  };

  const startNewChat = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/new_chat');
      const newSessionId = response.data.session_id;
      setSessionId(newSessionId);
      localStorage.setItem('session_id', newSessionId);
      console.log('New chat started with session ID:', newSessionId);

      if (db) {
        await db.put('embeddings', { sessionId: newSessionId, embeddings: "", timestamp: Date.now() });
        const sessions = await db.getAllFromIndex('embeddings', 'timestamp');
        setAvailableSessions(sessions.reverse().map(s => s.sessionId));
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const fetchChatsForSession = async (sessionId) => {
    if (db && sessionId) {
      const storedChats = await db.getAllFromIndex('chats', 'sessionIdIndex', sessionId);
      setPreviousChats(storedChats);
      console.log('Loaded previous chats for session:', sessionId);

      const storedEmbeddings = await db.get('embeddings', sessionId);
      if (storedEmbeddings) {
        console.log('Loaded embeddings for session:', sessionId);
      }

      const storedFiles = await db.getAllFromIndex('files', 'sessionIdIndex', sessionId);
      setFileNames(storedFiles.map(file => file.name));
      console.log('Loaded file names for session:', sessionId);

      setSessionId(sessionId);
      localStorage.setItem('session_id', sessionId);

    }
  };

  const fetchEmbeddingsFromIndexedDB = async () => {
    if (db && sessionId) {
      const storedEmbeddings = await db.get('embeddings', sessionId);
      if (storedEmbeddings) {
        return storedEmbeddings.embeddings;
      }
    }
    return null;
  };

  const addQuestionToChat = (chat, update = false) => {
    setPreviousChats(prevChats => {
      if (update) {
        return prevChats.map(c => (c.question === chat.question ? chat : c));
      } else {
        return [...prevChats, chat];
      }
    });
  };

  const deleteSession = async (sessionId) => {
    try {
      if (db) {
        const tx = db.transaction(['embeddings', 'chats', 'files'], 'readwrite');
        const embeddingsStore = tx.objectStore('embeddings');
        const chatsStore = tx.objectStore('chats');
        const filesStore = tx.objectStore('files');
  
        await embeddingsStore.delete(sessionId);
  
        const allChats = await chatsStore.getAll();
        const sessionChats = allChats.filter(chat => chat.sessionId === sessionId);
        for (let chat of sessionChats) {
          await chatsStore.delete(chat.id);
        }
  
        const allFiles = await filesStore.getAll();
        const sessionFiles = allFiles.filter(file => file.sessionId === sessionId);
        for (let file of sessionFiles) {
          await filesStore.delete(file.id);
        }
  
        await tx.done;
        
        const sessions = await db.getAllFromIndex('embeddings', 'timestamp');
        setAvailableSessions(sessions.reverse().map(s => s.sessionId));
        
        if (sessionId === localStorage.getItem('session_id')) {
          localStorage.removeItem('session_id');
          setSessionId(null);
          setPreviousChats([]);
          setFileNames([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };
  return (
    <div className="App">
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <img src={gptLogo} alt="Logo" className="logo" />
            <span className="brand">Chat With Author</span>
          </div>
          <button className="midBtn" onClick={startNewChat}>
            <img src={addBtn} alt="new chat" className="addBtn" />New Chat
          </button>
          <UploadPDF saveFileNames={saveFileNamesToIndexedDB} saveEmbeddingsToIndexedDB={saveEmbeddingsToIndexedDB} fileNames={fileNames} />
        </div>
        <div className="lowerSide">
          {availableSessions.map((id, index) => (
            <div key={id} className="sessionItem">
              <button className="query" onClick={() => fetchChatsForSession(id)}>
                <img src={msgIcon} alt="Query" />Chat {availableSessions.length - index}
              </button>
              <button className="deleteBtn" onClick={() => deleteSession(id)}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
      <div className="main">
        <div className="chats">
          <div className="chatHeader">{chatName}</div>
          {previousChats.map((chat) => (
            <div key={chat.id} className="chat">
              <div className="chat user">
                <img className="chatimg t1" src={userIcon} alt="User Icon" />
                <div className="txt">
                  <strong>Question:</strong> {chat.question}
                </div>
                <small>{chat.timestamp}</small>
              </div>
              <div key={`response-${chat.id}`} className="chat bot">
                <img className="chatimg t2" src={gptImgLogo} alt="GPT Logo" />
                <div className="txt">
                  <strong>Response</strong> <pre>{chat.response}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="chatFooter">
        {sessionId && (
          <AskQuestion
            sessionId={sessionId}
            saveChat={saveChatToIndexedDB}
            addQuestionToChat={addQuestionToChat}
            fetchEmbeddings={fetchEmbeddingsFromIndexedDB}
          />
        )}
        </div>
      </div>
    </div>
  );
}

export default App;
