# Use the official Python 3.13 slim image as a base
FROM python:3.13-slim

# Set the working directory in the container
WORKDIR /app

# Copy the project files into the container
COPY . .

# Install Poetry
RUN pip install poetry

# Install project dependencies using Poetry
RUN poetry install --no-root

# Verify the installation
RUN ls -l /usr/local/lib/python3.13/site-packages/google

# Expose the port the app runs on
EXPOSE 8081

# Define the command to run the application
CMD ["poetry", "run", "python", "main.py"]
