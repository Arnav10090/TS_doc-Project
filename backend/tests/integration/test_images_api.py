"""
Integration tests for Images API.
"""
import pytest
from httpx import AsyncClient
from io import BytesIO


@pytest.mark.asyncio
async def test_upload_valid_image_returns_200_with_url(
    client: AsyncClient, create_test_project
):
    """Test uploading a valid image returns 200 with url."""
    project = await create_test_project()
    
    # Create a fake PNG file
    fake_image = BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
    
    files = {
        "file": ("test.png", fake_image, "image/png")
    }
    
    response = await client.post(
        f"/api/v1/projects/{project.id}/images/architecture",
        files=files
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "architecture.png" in data["url"]


@pytest.mark.asyncio
async def test_upload_invalid_file_type_returns_400(
    client: AsyncClient, create_test_project
):
    """Test uploading an invalid file type returns 400."""
    project = await create_test_project()
    
    # Create a fake text file
    fake_file = BytesIO(b'This is not an image')
    
    files = {
        "file": ("test.txt", fake_file, "text/plain")
    }
    
    response = await client.post(
        f"/api/v1/projects/{project.id}/images/architecture",
        files=files
    )
    
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_oversized_file_returns_400(
    client: AsyncClient, create_test_project
):
    """Test uploading an oversized file returns 400."""
    project = await create_test_project()
    
    # Create a file larger than 10MB
    large_file = BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * (11 * 1024 * 1024))
    
    files = {
        "file": ("large.png", large_file, "image/png")
    }
    
    response = await client.post(
        f"/api/v1/projects/{project.id}/images/architecture",
        files=files
    )
    
    assert response.status_code == 400
