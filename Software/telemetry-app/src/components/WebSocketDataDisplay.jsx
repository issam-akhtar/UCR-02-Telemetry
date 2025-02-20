import React, { useEffect, useState } from 'react';
import { wsService } from '../services/websocket';

const WebSocketDataDisplay = () => {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const unsubscribe = wsService.subscribe('cell', (message) => {
      setMessages(prev => [message, ...prev]);
    });
    return () => unsubscribe();
  }, []);

  const filteredMessages = messages.filter(msg =>
    JSON.stringify(msg).toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const currentMessages = filteredMessages.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Incoming WebSocket Data</h2>
      <input
        type="text"
        placeholder="Filter messages..."
        value={filter}
        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        style={{ marginBottom: '1rem', padding: '0.5rem', width: '80%' }}
      />
      {filteredMessages.length === 0 ? (
        <p>No messages received yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {currentMessages.map((msg, idx) => (
            <li key={idx} style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <pre>{JSON.stringify(msg, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1}>Prev</button>
        <span style={{ margin: '0 1rem' }}>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  );
};

export default WebSocketDataDisplay;
