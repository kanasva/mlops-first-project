FROM python:3.10.7-slim
WORKDIR /iris-mlops
STOPSIGNAL SIGINT

ENV LISTEN_PORT 80

# System dependencies
RUN apt update && apt install -y libgomp1
RUN pip3 install poetry

# Project dependencies
COPY poetry.lock pyproject.toml ./

RUN poetry config virtualenvs.create false
RUN poetry install --no-interaction --no-ansi --no-dev

COPY . .

WORKDIR /iris-mlops/src
ENTRYPOINT uvicorn iris_mlops.serving.__main__:app --host 0.0.0.0 --port $LISTEN_PORT --workers 2
