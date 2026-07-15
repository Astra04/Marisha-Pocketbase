FROM alpine:3.19

# Install dependencies
RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and install PocketBase (v0.22.14 is a stable version with JS hooks support)
ENV PB_VERSION=0.22.14
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip

EXPOSE 8090

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
