# Use the official Node.js 18 Alpine image as the base
FROM node:18-alpine AS build-backend

# Install required build tools and dependencies
RUN apk add --no-cache ffmpeg python3 make g++

# Set the working directory inside the container
WORKDIR /app/backend

# Copy only the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies inside the container to ensure compatibility
RUN npm install

# Rebuild bcrypt specifically to ensure it's built for the correct architecture
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of the application code
COPY . .

# Expose the port that the application will run on
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
