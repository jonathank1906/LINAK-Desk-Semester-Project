FROM python:3.13-alpine3.22

WORKDIR /app

# Copy the simulator code
COPY . .

EXPOSE 8001

# Run the simulator
CMD ["python", "simulator/main.py", "--no-user-simulation", "--desk-collision-chance", "0", "--desk-poweroff-chance", "0", "--port", "8001"]