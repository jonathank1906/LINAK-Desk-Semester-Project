FROM node:24

COPY ./frontend /frontend
RUN rm -rf /frontend/node_modules

WORKDIR /frontend
RUN npm ci

CMD ["npm", "run", "dev"]