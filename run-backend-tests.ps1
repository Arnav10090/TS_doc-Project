# PowerShell script to run backend tests inside Docker container

Write-Host "Running backend tests inside Docker container..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Run pytest inside the backend container
docker exec -it ts_generator_backend pytest -v

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Tests complete!" -ForegroundColor Green
