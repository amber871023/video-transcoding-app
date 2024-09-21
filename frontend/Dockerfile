# Frontend Dockerfile (Dockerfile.frontend)
FROM node:18-alpine AS build-frontend

# Set the working directory inside the container
WORKDIR /app/frontend

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire frontend source code
COPY . .

# # Stage to serve the frontend
# FROM nginx:alpine
# COPY --from=build-frontend /app/build /usr/share/nginx/html

# Expose port 3000
EXPOSE 3000

CMD ["npm", "start"]
