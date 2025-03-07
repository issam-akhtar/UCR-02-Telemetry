import React, { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';

const WebSocketDataDisplay = () => {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const unsubscribe = wsService.subscribe('ins_imu', (message) => {
      setMessages((prev) => [message, ...prev]);
    });
    return () => unsubscribe();
  }, []);

  const filtered = messages.filter((msg) =>
    JSON.stringify(msg).toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentMessages = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Incoming WebSocket Data</h2>
      <input
        type="text"
        placeholder="Filter messages..."
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setPage(1);
        }}
        style={{ marginBottom: '1rem', padding: '0.5rem', width: '80%' }}
      />
      {filtered.length === 0 ? (
        <p>No messages received yet.</p>
      ) : (
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '0.5rem',
          }}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {currentMessages.map((msg, idx) => (
              <li key={idx} style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <pre style={{ color: '#ecf3e8', backgroundColor: '#161A1D' }}>
                  {JSON.stringify(msg, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
          Prev
        </button>
        <span style={{ margin: '0 1rem' }}>
          Page {page} of {totalPages}
        </span>
        <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default WebSocketDataDisplay;
