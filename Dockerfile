FROM python:3.13.7-alpine3.22

ENV PYTHONUNBUFFERED 1

COPY ./requirements.txt /requirements.txt

# Install system dependencies first
RUN apk add --update --upgrade --no-cache postgresql-client postgresql-libs postgresql-dev build-base

# Now create the venv and install Python packages
RUN python -m venv /py && \
    /py/bin/pip install --upgrade pip && \
    /py/bin/pip install -r /requirements.txt

COPY ./backend /backend
WORKDIR /backend

ENV PATH="/py/bin:$PATH"

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]