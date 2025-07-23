#!/bin/bash
cd ../src/Backend/dcls_senario
conda activate easy-notebook
uvicorn main:app --host 0.0.0.0 --port 28600 --reload