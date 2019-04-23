FROM ubuntu:latest
ENV DEBIAN_FRONTEND noninteractive

# Install system dependencies
RUN apt-get update \
    && apt-get install -y nodejs libsecret-1-dev git curl
RUN curl -sL https://deb.nodesource.com/setup_11.x | bash -
RUN apt-get install -y nodejs && npm install -g yarn

# Clone and install wait-for-it
RUN git clone https://github.com/vishnubob/wait-for-it \
    && cp wait-for-it/wait-for-it.sh /usr/local/bin \
    && chmod +x /usr/local/bin/wait-for-it.sh \
    && rm -rf wait-for-it

WORKDIR /src
ENTRYPOINT ["./run-tests.sh"]

# Install project dependencies
COPY package.json /src
COPY yarn.lock /src
RUN yarn --pure-lockfile

# Copy src into the destination folder
COPY . /src