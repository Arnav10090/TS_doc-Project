"""
Images API router.
Handles image upload, retrieval, and deletion endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pathlib import Path
from typing import List
from uuid import UUID
import os
import aiofiles

from app.images.service import validate_image
from app.config import settings

router = APIRouter(prefix="/api/v1/projects", tags=["images"])

VALID_IMAGE_TYPES = ["architecture", "gantt_overall", "gantt_shutdown"]


@router.post("/{project_id}/images/{image_type}")
async def upload_image(project_id: UUID, image_type: str, file: UploadFile = File(...)):
    """Upload an image for a project."""
    # Validate image type
    if image_type not in VALID_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image_type. Must be one of: {', '.join(VALID_IMAGE_TYPES)}",
        )
    
    # Validate image file
    content = await validate_image(file)
    
    # Prepare directory
    images_dir = Path(settings.UPLOAD_DIR) / "images" / str(project_id)
    images_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file (always as .png)
    file_path = images_dir / f"{image_type}.png"
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    # Return URL
    url = f"http://localhost:8000/uploads/images/{project_id}/{image_type}.png"
    return {"url": url}


@router.get("/{project_id}/images")
async def get_project_images(project_id: UUID):
    """Get list of uploaded images for a project."""
    images_dir = Path(settings.UPLOAD_DIR) / "images" / str(project_id)
    
    if not images_dir.exists():
        return []
    
    result = []
    for image_type in VALID_IMAGE_TYPES:
        file_path = images_dir / f"{image_type}.png"
        if file_path.exists():
            url = f"http://localhost:8000/uploads/images/{project_id}/{image_type}.png"
            result.append({"type": image_type, "url": url})
    
    return result


@router.delete("/{project_id}/images/{image_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(project_id: UUID, image_type: str):
    """Delete an uploaded image."""
    # Validate image type
    if image_type not in VALID_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image_type. Must be one of: {', '.join(VALID_IMAGE_TYPES)}",
        )
    
    # Check if file exists
    file_path = Path(settings.UPLOAD_DIR) / "images" / str(project_id) / f"{image_type}.png"
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )
    
    # Delete file
    os.remove(file_path)
    return None
