#!/bin/bash
# StudyFlow — avvio server Python

echo ""
echo "  StudyFlow — avvio in corso..."
echo ""

# Installa dipendenze se necessario
if ! python3 -c "import flask" 2>/dev/null; then
    echo "  Installazione Flask..."
    pip3 install flask --quiet
fi

# Avvia il server in background
python3 "$(dirname "$0")/app.py" &
SERVER_PID=$!

sleep 1.5

# Apri il browser
echo "  Apertura browser su http://localhost:5002"
open http://localhost:5002

echo "  Server in esecuzione (PID $SERVER_PID)"
echo "  Premi CTRL+C per fermare."
echo ""

# Aspetta CTRL+C
trap "kill $SERVER_PID 2>/dev/null; echo '  Server fermato.'; exit" INT
wait $SERVER_PID
