FROM node:20-alpine

WORKDIR /app

# Copier package.json w installi les dependances
COPY package*.json ./
RUN npm install

# Copier ga3 l'code dyal l'frontend
COPY . .

# Buildi l'projet l production
RUN npm run build

# L'port dyal Next.js
EXPOSE 3000

# Lancer l'app
CMD ["npm", "start"]