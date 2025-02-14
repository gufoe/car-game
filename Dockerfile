FROM node:alpine
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build
EXPOSE 4173
ENTRYPOINT ["yarn", "preview", "--host", "0.0.0.0"]