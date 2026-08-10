# Nkhdmo b Python 3.11 (Stable w khfif)
FROM python:3.11-slim

# N-installiw FFMPEG w libsndfile (li kat7tajha librosa f Linux)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# N-gadou l'dossier dyal l'app
WORKDIR /app

# N-copiw les requirements w n-installiwhm
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# N-copiw l'code dyalna
COPY . .

# ⚠️ THE FIX: N-7ellou l'port 8556
EXPOSE 8556

# ⚠️ THE FIX: N-lanciow l'serveur f l'port 8556 b 4 dyal les Workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8556", "--workers", "4"]