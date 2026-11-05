The Docker image runs the ZW edition CLI without installing Node.js or a global npm package on the host. Mount your current directory at `/data`; the image entrypoint is `httpyac` and the working directory is `/data`.

## Run

Show CLI help:

```shell
docker run -it -v ${PWD}:/data ghcr.io/zerowiggliness/httpyac:latest --help
```

Run a request file:

```shell
docker run -it -v ${PWD}:/data ghcr.io/zerowiggliness/httpyac:latest send example.http
```

Run all matching files:

```shell
docker run -it -v ${PWD}:/data ghcr.io/zerowiggliness/httpyac:latest send "**/*.http" --all
```

Add Docker options such as `--rm`, `--env`, `--network` or extra volume mounts before the image name when your requests need them.

### Runners that override the entrypoint

The `httpyac` command is also available on `PATH`, so runners such as Maven can invoke it even when they override the image entrypoint. For example:

```shell
docker run --rm --entrypoint /bin/sh ghcr.io/zerowiggliness/httpyac:latest -c 'httpyac --version'
```

## Upgrade

Pull the latest published image:

```shell
docker pull ghcr.io/zerowiggliness/httpyac:latest
```

## Image details

The repository Dockerfile uses `node:24` for both the build and runtime stages.

> [!NOTE]
> **ZW edition:** the Docker image is published as `ghcr.io/zerowiggliness/httpyac:latest`, is Node 24 based, and the published image covers the Kafka native dependency used by [Kafka](Guide-Kafka). See [ZW edition differences](ZW-Edition-Differences).

For command options, see the [CLI](Installation-CLI) page.
