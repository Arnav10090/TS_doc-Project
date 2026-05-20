#!/bin/bash

# Script to run backend tests inside Docker container

echo "Running backend tests inside Docker container..."
echo "================================================"
echo ""

# Run pytest inside the backend container
docker exec -it ts_generator_backend pytest -v

echo ""
echo "================================================"
echo "Tests complete!"
