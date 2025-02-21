# Node.js 18 version for the frontend
FROM node:18-alpine

# working directory inside the container
WORKDIR /src

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the frontend into the container
COPY . .

# Expose the port for Vite (default for now too)
EXPOSE 3000

# Start the server
CMD ["npm", "run", "dev"]
