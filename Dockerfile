FROM node:22-alpine
RUN apk add --no-cache openssl

EXPOSE 3000
WORKDIR /app

ENV NODE_ENV=production
# relax engine checks that shout about Node >=20 (we're on 22 anyway)
ENV NPM_CONFIG_ENGINE_STRICT=false

COPY package.json package-lock.json* ./

# Use install (not ci) because upstream lockfile is out of sync
# and allow legacy peer deps to bypass transient peer conflicts
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Remove CLI if present, but don't fail if it's not installed
RUN npm remove @shopify/cli || true

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]


