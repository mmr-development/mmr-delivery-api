FROM node

WORKDIR /app

COPY package*.json ./

COPY keys/ /app/keys/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
