# Menggunakan image Node.js resmi sebagai base image
FROM node:20

# Mengatur working directory
WORKDIR /app

# Menyalin package.json dan package-lock.json
COPY package*.json ./

# Menginstall dependencies
RUN npm install

# Menyalin semua file ke working directory
COPY . .

# Mengekspos port yang digunakan aplikasi
EXPOSE 3121

# Menjalankan aplikasi
CMD ["npm", "start"]
