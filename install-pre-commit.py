#!/usr/bin/env python3
import subprocess
import sys
import os
#import venv

# Define the directory for the virtual environment
venv_dir = os.path.join(os.getcwd(), 'venv')

# Platform-specific adjustments
if sys.platform == "win32":
    python_executable = os.path.join(venv_dir, 'Scripts', 'python.exe')
    pip_executable = os.path.join(venv_dir, 'Scripts', 'pip.exe')
    pre_commit_executable = os.path.join(venv_dir, 'Scripts', 'pre-commit.exe')
else:
    python_executable = os.path.join(venv_dir, 'bin', 'python')
    pip_executable = os.path.join(venv_dir, 'bin', 'pip')
    pre_commit_executable = os.path.join(venv_dir, 'bin', 'pre-commit')

def create_venv():
    """Create a virtual environment if it doesn't exist and return its path."""
    venv_dir = os.path.join(os.getcwd(), 'venv')
    if not os.path.exists(venv_dir):
        print("Creating virtual environment...")
        subprocess.check_call([sys.executable, "-m", "venv", venv_dir])
    return venv_dir

# Function to install packages using pip in the virtual environment
def install_package(package):
    subprocess.check_call([pip_executable, 'install', package])

# Create the virtual environment
#venv.create(venv_dir, with_pip=True)
venv_dir = create_venv()

# Install pre-commit in the virtual environment
install_package('pre-commit==3.7.0')

# Run pre-commit install using the executable in the virtual environment
subprocess.check_call([pre_commit_executable, 'install'])
