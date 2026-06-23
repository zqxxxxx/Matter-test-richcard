# syntax=docker/dockerfile:1.7
FROM node:22.16.0-bookworm AS builder
WORKDIR /app
ENV CI=true
RUN npm install -g pnpm@10
RUN pnpm config set registry https://registry.npmmirror.com
RUN git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/" && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/dmworkappbot/package.json packages/dmworkappbot/package.json
COPY packages/dmworkbase/package.json packages/dmworkbase/package.json
COPY packages/dmworkcontacts/package.json packages/dmworkcontacts/package.json
COPY packages/dmworkdatasource/package.json packages/dmworkdatasource/package.json
COPY packages/dmworklogin/package.json packages/dmworklogin/package.json
COPY packages/dmworksummary/package.json packages/dmworksummary/package.json
COPY packages/dmworktodo/package.json packages/dmworktodo/package.json
COPY packages/eslint-config-custom/package.json packages/eslint-config-custom/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN --mount=type=cache,id=octo-web-pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prefer-offline
COPY . .
RUN --mount=type=cache,id=octo-web-pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prefer-offline && pnpm turbo run build --filter=@octo/web

FROM nginx:alpine
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint2.sh 
RUN sed -i 's/\r$//' /docker-entrypoint2.sh
COPY --from=builder /app/nginx.conf.template /
COPY --from=builder /app/apps/web/build /usr/share/nginx/html
RUN chmod -R a+r /usr/share/nginx/html
ENTRYPOINT ["sh", "/docker-entrypoint2.sh"]
CMD ["nginx","-g","daemon off;"]
