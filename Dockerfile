FROM node:18 as build
ENV NODE_ENV=production
COPY bin /httpyac/bin
COPY dist /httpyac/dist
COPY package.json /httpyac/package.json
RUN sed -i -e '/prepare/d' /httpyac/package.json

FROM node:18
COPY --from=build /httpyac /httpyac
RUN cd /httpyac && npm link
WORKDIR data
USER node
ENTRYPOINT [ "node", "/httpyac/bin/httpyac.js" ]