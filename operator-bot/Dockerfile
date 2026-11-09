FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY bot.mjs ./
COPY customer.mjs customer-core.mjs ./
RUN mkdir /data && chown node:node /data
VOLUME ["/data"]
USER node
CMD ["npm", "start"]
