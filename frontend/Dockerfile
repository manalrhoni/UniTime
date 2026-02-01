# Utilisez Node 22
FROM node:22-alpine

WORKDIR /app

# Copie des fichiers de configuration
COPY package.json package-lock.json ./

# --- MODIFICATION ICI : Ajout de --legacy-peer-deps ---
# Cela dit à NPM : "Installe les paquets même si les versions ne correspondent pas parfaitement"
RUN npm install --legacy-peer-deps

# Copie du reste des fichiers
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]