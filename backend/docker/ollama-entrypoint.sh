#!/bin/bash
set -e

echo "==> Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "==> Waiting for Ollama to be ready..."
until echo >/dev/tcp/localhost/11434 2>/dev/null; do
    echo "   ...not ready yet, retrying in 2s"
    sleep 2
done
sleep 2

echo "==> Ollama is ready. Pulling llama3.2 model (skipped if already cached)..."
ollama pull llama3.2

echo "==> llama3.2 is available. Ollama running with PID $OLLAMA_PID"

wait $OLLAMA_PID
