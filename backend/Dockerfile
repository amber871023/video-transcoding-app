# Backend Dockerfile (Dockerfile.backend)
FROM node:18-alpine AS build-backend

RUN apk add --no-cache ffmpeg
# Set the working directory inside the container
WORKDIR /app/backend

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire backend source code
COPY . .

# Expose the port the backend will run on
EXPOSE 3000

# Start the backend server
CMD ["node", "app.js"]
