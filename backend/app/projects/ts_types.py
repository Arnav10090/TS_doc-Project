"""TS Type enumeration and utilities for categorizing technical specifications.

This module defines the TS Type hierarchy used for:
1. Categorizing projects by technical domain
2. Resolving folder paths for historical document retrieval
3. Providing display labels for UI dropdowns
"""

from enum import Enum
from typing import List, Tuple


class TSType(str, Enum):
    """
    TS Type enumeration representing technical specification categories.
    
    Format: "Category/Subcategory/..." (supports multi-level hierarchy)
    Display: "Category — Subcategory — ..." (em dash separator)
    """
    
    # Data Analysis Category - Advanced Analysis
    DATA_ANALYSIS_ADVANCED_ANALYSIS = "Data Analysis/Advanced Analysis"
    DATA_ANALYSIS_ADVANCED_ANALYSIS_AUTOML = "Data Analysis/Advanced Analysis/AutoML Platform"
    
    # Data Analysis Category - Data Centralization
    DATA_ANALYSIS_DATA_CENTRALIZATION = "Data Analysis/Data Centralization"
    DATA_ANALYSIS_DATA_CENTRALIZATION_HISTORIAN = "Data Analysis/Data Centralization/Historian"
    DATA_ANALYSIS_DATA_CENTRALIZATION_UGS = "Data Analysis/Data Centralization/UGS"
    
    # Data Analysis Category - Data Monitoring
    DATA_ANALYSIS_DATA_MONITORING = "Data Analysis/Data Monitoring"
    DATA_ANALYSIS_DATA_MONITORING_EMS = "Data Analysis/Data Monitoring/EMS"
    DATA_ANALYSIS_DATA_MONITORING_HPMS = "Data Analysis/Data Monitoring/HPMS"
    DATA_ANALYSIS_DATA_MONITORING_RAS = "Data Analysis/Data Monitoring/RAS"
    
    # Level 2 Category
    LEVEL_2 = "Level 2"
    
    # OT Cybersecurity Category
    OT_CYBERSECURITY = "OT Cybersecurity"
    
    # OT Upgrades Category
    OT_UPGRADES_HMI = "OT Upgrades/HMI"
    OT_UPGRADES_L2 = "OT Upgrades/L2"
    OT_UPGRADES_POC_UPGRADE = "OT Upgrades/POC Upgrade"
    
    # Yard Management Category
    YARD_MANAGEMENT_HSM = "Yard Management/HSM"
    YARD_MANAGEMENT_PLATE_MILL = "Yard Management/Plate Mill"
    
    def get_display_label(self) -> str:
        """
        Convert TS type value to display format with em dash separator.
        
        Supports multi-level hierarchy (e.g., "Category/Subcategory/Item" → "Category — Subcategory — Item").
        
        Returns:
            Display label with format "Category — Subcategory — ..." (em dashes between all levels)
            
        Example:
            >>> TSType.DATA_ANALYSIS_DATA_CENTRALIZATION.get_display_label()
            "Data Analysis — Data Centralization"
            >>> TSType.DATA_ANALYSIS_DATA_CENTRALIZATION_HISTORIAN.get_display_label()
            "Data Analysis — Data Centralization — Historian"
        """
        # Replace forward slashes with em dash and spaces
        return self.value.replace("/", " — ")
    
    def to_folder_path(self) -> str:
        """
        Convert TS type value to folder path for historical document retrieval.
        
        The folder path uses the raw value format which supports multi-level hierarchy
        (e.g., "Data Analysis/Data Centralization/Historian") and maps directly to the 
        filesystem structure under ts_documents/.
        
        Returns:
            Folder path relative to TS_DOCUMENTS_DIR (supports nested directories)
            
        Example:
            >>> TSType.DATA_ANALYSIS_DATA_CENTRALIZATION.to_folder_path()
            "Data Analysis/Data Centralization"
            >>> TSType.DATA_ANALYSIS_DATA_CENTRALIZATION_HISTORIAN.to_folder_path()
            "Data Analysis/Data Centralization/Historian"
            
        Note:
            The retrieval module must validate this path against TS_DOCUMENTS_DIR
            to prevent path traversal attacks.
        """
        return self.value
    
    @classmethod
    def get_all_options(cls) -> List[Tuple[str, str]]:
        """
        Get all TS type options as (value, label) tuples.
        
        Returns:
            List of tuples (value, display_label) for all TS types
            
        Example:
            >>> TSType.get_all_options()
            [
                ("Data Analysis/Advanced Analysis", "Data Analysis — Advanced Analysis"),
                ("Data Analysis/Advanced Analysis/AutoML Platform", "Data Analysis — Advanced Analysis — AutoML Platform"),
                ("Data Analysis/Data Centralization", "Data Analysis — Data Centralization"),
                ("Data Analysis/Data Centralization/Historian", "Data Analysis — Data Centralization — Historian"),
                ...
            ]
        """
        return [(ts_type.value, ts_type.get_display_label()) for ts_type in cls]
    
    @classmethod
    def is_valid(cls, value: str) -> bool:
        """
        Check if a given string is a valid TS type value.
        
        Args:
            value: String to validate against TSType enum values
            
        Returns:
            True if value matches a TSType enum value, False otherwise
            
        Example:
            >>> TSType.is_valid("Data Analysis/Data Centralization")
            True
            >>> TSType.is_valid("Invalid/Category")
            False
        """
        return value in [ts_type.value for ts_type in cls]
