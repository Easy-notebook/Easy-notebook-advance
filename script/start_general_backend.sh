#!/bin/bash
cd ../src/Backend/backend
conda activate easy-notebook
uvicorn backend:app --host 0.0.0.0 --port 18600 --reload