"""
Setup script for kode_ocean package

Installation:
    pip install -e .

Or in conda environment:
    conda activate agentUse
    cd Kode-Ocean/ocean_scripts
    pip install -e .
"""

from setuptools import setup, find_packages

setup(
    name="kode-ocean",
    version="0.1.0",
    description="Automatic Dashboard Monitoring for Ocean ML Training",
    long_description=open("../README.md", encoding="utf-8").read() if __name__ == "__main__" else "",
    long_description_content_type="text/markdown",
    author="Ocean ML Team",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "torch>=2.0.0",
        "requests>=2.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ]
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    entry_points={},
    include_package_data=True,
)
