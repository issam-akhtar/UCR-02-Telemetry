# Node.js 18 version for the frontend
FROM node:18-alpine

# working directory inside the container
WORKDIR /src

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the frontend into the container
COPY . .

# Expose the port for Vite (default for now too)
EXPOSE 9093

# Start the server
CMD ["npm", "run", "dev"]
