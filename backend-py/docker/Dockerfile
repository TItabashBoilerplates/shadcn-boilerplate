# FROM ubuntu:20.04
FROM python:3.13-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime

# RUN apt -y update && apt -y upgrade && apt -y install gcc g++ make curl python3 tzdata python3-venv libedit2
RUN apt -y update && apt -y upgrade && apt -y install gcc g++ make curl tzdata libedit2 nodejs npm libopus-dev libvpx-dev
RUN npm install n -g
RUN n stable
RUN apt purge -y nodejs npm
RUN apt autoremove -y

SHELL ["/bin/bash", "-l", "-c"]
