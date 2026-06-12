import os

# Provide a dummy API_ENDPOINT so tests can import app modules without a .env file.
# In production the real value must be set in .env — see .env.example.
os.environ.setdefault("API_ENDPOINT", "http://test-placeholder")
