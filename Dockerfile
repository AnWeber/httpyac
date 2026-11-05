FROM node:24 as build
ENV NODE_ENV=production
COPY bin /httpyac/bin
COPY dist /httpyac/dist
COPY package.json package-lock.json /httpyac/
RUN sed -i -e '/prepare/d' /httpyac/package.json
RUN cd /httpyac && npm ci --omit=dev --include=optional

FROM node:24
COPY --from=build /httpyac /httpyac
RUN ln -s /httpyac/bin/httpyac.js /usr/local/bin/httpyac
WORKDIR data
USER node
ENTRYPOINT [ "node", "/httpyac/bin/httpyac.js" ]