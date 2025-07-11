import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [boardData, setBoardData] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [pendingPiece, setPendingPiece] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8888/ws");
    ws.onmessage = (event) => {
      setMessages(prev => [...prev, event.data]);
    };
    setSocket(ws);
    return () => ws.close();
  }, []);

  const handleTableCommand = (command) => {
    const match = command.match(/^\/table\s+(\d{1,2})x(\d{1,2})$/i);
    if (!match) {
      alert("Hibás parancs! Használat: /table NxM (pl. /table 5x5)");
      return;
    }

    const rows = parseInt(match[1]);
    const cols = parseInt(match[2]);

    if (rows > 20 || cols > 20) {
      alert("A maximális méret 20x20!");
      return;
    }

    const newBoard = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "")
    );
    setBoardData(newBoard);
    setMessages(prev => [...prev, `Táblaméret beállítva: ${rows}x${cols}`]);
    setPieces([]);
  };

  const handlePieceCommand = (command) => {
    const match = command.match(/^\/piece\s+(\w+)\s+(\S+)$/i);
    if (!match) {
      alert("Hibás parancs! Használat: /piece [név] [png|name|fájlnév.png]");
      return;
    }

    const name = match[1];
    const appearance = match[2];

    if (appearance === "png") {
      setPendingPiece({ name });
      alert("Kérlek tölts fel egy PNG fájlt a bábuhoz.");
      return;
    }

    const newPiece = {
      id: `${name}-${Date.now()}`,
      name,
      row: 0,
      col: 0,
    };

    if (appearance.endsWith(".png")) {
      newPiece.image = `/uploads/${appearance}`;
    } else if (appearance === "name") {
      newPiece.text = name.substring(0, 3).toUpperCase();
    } else {
      alert("Érvénytelen megjelenítés: csak PNG vagy 'name' használható.");
      return;
    }

    if (pieces.some(p => p.row === 0 && p.col === 0)) {
      alert("A kezdőmezőn (0,0) már van bábu! Helyezd át előbb.");
      return;
    }

    setPieces(prev => [...prev, newPiece]);
  };

  const handleChessCommand = () => {
    const size = 8;
    const newBoard = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => "")
    );
    setBoardData(newBoard);

    const whitePieces = ['♖','♘','♗','♕','♔','♗','♘','♖'];
    const blackPieces = ['♜','♞','♝','♛','♚','♝','♞','♜'];

    const initialPieces = [];

    for (let i = 0; i < size; i++) {
      initialPieces.push({ id: `b${i}`, name: 'black', text: blackPieces[i], row: 0, col: i });
      initialPieces.push({ id: `bp${i}`, name: 'black', text: '♟', row: 1, col: i });
      initialPieces.push({ id: `wp${i}`, name: 'white', text: '♙', row: 6, col: i });
      initialPieces.push({ id: `w${i}`, name: 'white', text: whitePieces[i], row: 7, col: i });
    }

    setPieces(initialPieces);
    setMessages(prev => [...prev, "Sakktábla létrehozva!"]);
  };

  const sendMessage = () => {
    const trimmed = input.trim();

    if (trimmed.startsWith("/table")) {
      handleTableCommand(trimmed);
    } else if (trimmed.startsWith("/piece")) {
      handlePieceCommand(trimmed);
    } else if (trimmed === "/chess") {
      handleChessCommand();
    } else if (socket && trimmed !== "") {
      socket.send(trimmed);
      setMessages(prev => [...prev, trimmed]);
    }

    setInput("");
  };

  const handleCellClick = (rowIndex, colIndex) => {
    const last = pieces[pieces.length - 1];
    if (!last) return;

    if (pieces.some(p => p.row === rowIndex && p.col === colIndex)) {
      alert("Ide már van bábu!");
      return;
    }

    setPieces(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        row: rowIndex,
        col: colIndex
      };
      return updated;
    });
  };

  const handleDragStart = (e, pieceId) => {
    e.dataTransfer.setData("text/plain", pieceId);
  };

  const handleDrop = (e, rowIndex, colIndex) => {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData("text/plain");

    if (pieces.some(p => p.row === rowIndex && p.col === colIndex)) {
      alert("Ide már van bábu!");
      return;
    }

    setPieces(prev =>
      prev.map(p =>
        p.id === pieceId ? { ...p, row: rowIndex, col: colIndex } : p
      )
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="container">
      <header className="header">🎲 Társasjáték Platform</header>

      <section className="board">
        {boardData.length === 0 ? (
          <p><i>Itt lesz a játéktábla</i></p>
        ) : (
          <div
            className="grid-board"
            style={{
              gridTemplateColumns: `repeat(${boardData[0].length}, 30px)`,
              gridTemplateRows: `repeat(${boardData.length}, 30px)`,
              gap: "0",
            }}
          >
            {boardData.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const piece = pieces.find(p => p.row === rowIndex && p.col === colIndex);
                const isLight = (rowIndex + colIndex) % 2 === 0;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="cell"
                    style={{
                      backgroundColor: isLight ? "#eee" : "#444",
                      color: isLight ? "#000" : "#fff",
                    }}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                  >
                    {piece && (
                      piece.image ? (
                        <img
                          src={piece.image}
                          alt={piece.name}
                          className="piece"
                          draggable
                          onDragStart={(e) => handleDragStart(e, piece.id)}
			  style={{ color: piece.name === 'white' ? '#fff' : '#000' }}
                        />
                      ) : (
                        <span
                          className="piece"
                          draggable
                          onDragStart={(e) => handleDragStart(e, piece.id)}
                        >
                          {piece.text}
                        </span>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <section className="chat">
        <ul>
          {messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <section className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Írj üzenetet vagy parancsot (pl. /table 5x5, /piece bábu name, /chess)"
        />
        <button onClick={sendMessage}>Küldés</button>
      </section>

      {pendingPiece && (
        <div className="upload-box">
          <p><b>{pendingPiece.name}</b> bábujához válassz egy PNG fájlt:</p>
          <input
            type="file"
            accept="image/png"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file || file.type !== "image/png") {
                alert("Csak PNG fájl engedélyezett!");
                return;
              }

              const reader = new FileReader();
              reader.onload = () => {
                const imagePiece = {
                  id: `${pendingPiece.name}-${Date.now()}`,
                  name: pendingPiece.name,
                  image: reader.result,
                  row: 0,
                  col: 0,
                };

                if (pieces.some(p => p.row === 0 && p.col === 0)) {
                  alert("A kezdőmezőn (0,0) már van bábu! Helyezd át előbb.");
                  return;
                }

                setPieces(prev => [...prev, imagePiece]);
                setPendingPiece(null);
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
