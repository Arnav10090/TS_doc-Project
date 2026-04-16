"""
Image validation and processing service.
"""
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg"]


async def validate_image(file: UploadFile) -> bytes:
    """
    Validate uploaded image file.
    
    Args:
        file: Uploaded file
    
    Returns:
        File content as bytes
    
    Raises:
        HTTPException: If validation fails
    """
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Must be PNG or JPEG. Got: {file.content_type}",
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 10MB limit. Got: {len(content) / (1024 * 1024):.2f}MB",
        )
    
    # Validate it's actually an image
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file: {str(e)}",
        )
    
    return content
